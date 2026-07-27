import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';
import { WarehouseRepository } from '../../domain/repositories/warehouse.repository';
import { ItemRepository } from '../../../catalog/domain/repositories/item.repository';
import { CompanyRepository } from '../../../companies/domain/repositories/company.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { ApplyStockMovementService } from '../services/apply-stock-movement.service';
import { StockMovementEntity } from '../../domain/entities/stock-movement.entity';
import { CreateStockTransferUseCaseInput } from '../dto/stock-movement.dto';
import { WarehouseNotFoundError } from '../../domain/errors/warehouse.errors';
import { ItemNotFoundError } from '../../../catalog/domain/errors/item.errors';
import {
  ItemDoesNotTrackStockError,
  MissingReasonError,
  InvalidQuantityError,
  SameWarehouseTransferError,
} from '../../domain/errors/stock-movement.errors';

export interface StockTransferResult {
  outMovement: StockMovementEntity;
  inMovement: StockMovementEntity;
}

/**
 * Transferencia entre depósitos (RN-STK-08/09): dos StockMovement
 * (TRANSFER_OUT + TRANSFER_IN) con el mismo transferGroupId, creados
 * atómicamente vía dos llamadas a `ApplyStockMovementService`. El costo que
 * "viaja" es el `unitCost` que devuelve la salida (= averageCost vigente en
 * el depósito de origen, RN-STK-05) — el destino recalcula su propio
 * promedio ponderado usando ese costo como el "entrante".
 */
@Injectable()
export class CreateStockTransferUseCase {
  constructor(
    private readonly warehouseRepository: WarehouseRepository,
    private readonly itemRepository: ItemRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly applyStockMovementService: ApplyStockMovementService,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: CreateStockTransferUseCaseInput): Promise<StockTransferResult> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    if (input.fromWarehouseId === input.toWarehouseId) {
      throw new SameWarehouseTransferError();
    }

    const fromWarehouse = await this.warehouseRepository.findById(
      input.fromWarehouseId,
      input.companyId,
    );
    if (!fromWarehouse) {
      throw new WarehouseNotFoundError();
    }
    const toWarehouse = await this.warehouseRepository.findById(
      input.toWarehouseId,
      input.companyId,
    );
    if (!toWarehouse) {
      throw new WarehouseNotFoundError();
    }

    const item = await this.itemRepository.findById(input.itemId, input.companyId);
    if (!item) {
      throw new ItemNotFoundError();
    }
    if (!item.tracksStock) {
      throw new ItemDoesNotTrackStockError();
    }

    const quantity = new Decimal(input.quantity);
    if (!quantity.isPositive() || quantity.isZero()) {
      throw new InvalidQuantityError();
    }
    if (!input.reason) {
      throw new MissingReasonError();
    }

    return this.unitOfWork.run(async (ctx) => {
      const transferGroupId = randomUUID();
      const company = await this.companyRepository.findById(input.companyId, ctx);
      const allowNegativeStock = company?.allowNegativeStock ?? false;

      const outMovement = await this.applyStockMovementService.apply(
        {
          companyId: input.companyId,
          itemId: input.itemId,
          warehouseId: input.fromWarehouseId,
          direction: 'OUT',
          type: 'TRANSFER_OUT',
          quantity: input.quantity,
          reason: input.reason,
          transferGroupId,
          userId: input.requestingUserId,
          allowNegativeStock,
        },
        ctx,
      );

      const inMovement = await this.applyStockMovementService.apply(
        {
          companyId: input.companyId,
          itemId: input.itemId,
          warehouseId: input.toWarehouseId,
          direction: 'IN',
          type: 'TRANSFER_IN',
          quantity: input.quantity,
          unitCost: outMovement.unitCost,
          reason: input.reason,
          transferGroupId,
          userId: input.requestingUserId,
          allowNegativeStock,
        },
        ctx,
      );

      // Una sola auditoría para todo el hecho de negocio (RN-STK-10): no se
      // duplica el registro por cada uno de los dos movimientos generados.
      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'stock.transfer',
          entityType: 'StockMovement',
          entityId: transferGroupId,
          metadata: {
            fromWarehouseId: input.fromWarehouseId,
            toWarehouseId: input.toWarehouseId,
            itemId: input.itemId,
            quantity: input.quantity,
            transferGroupId,
          },
        },
        ctx,
      );

      return { outMovement, inMovement };
    });
  }
}
