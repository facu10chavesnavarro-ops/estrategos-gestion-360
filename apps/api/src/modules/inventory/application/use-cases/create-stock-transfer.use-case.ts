import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';
import { WarehouseRepository } from '../../domain/repositories/warehouse.repository';
import { StockRepository } from '../../domain/repositories/stock.repository';
import { StockMovementRepository } from '../../domain/repositories/stock-movement.repository';
import { ItemRepository } from '../../../catalog/domain/repositories/item.repository';
import { CompanyRepository } from '../../../companies/domain/repositories/company.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { uuidv7 } from '../../../../common/infrastructure/id/uuid-v7';
import { StockMovementEntity } from '../../domain/entities/stock-movement.entity';
import { CreateStockTransferUseCaseInput } from '../dto/stock-movement.dto';
import { WarehouseNotFoundError } from '../../domain/errors/warehouse.errors';
import { ItemNotFoundError } from '../../../catalog/domain/errors/item.errors';
import {
  ItemDoesNotTrackStockError,
  InsufficientStockError,
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
 * atómicamente. El costo que "viaja" es el averageCost vigente en el
 * depósito de origen (RN-STK-05) — el destino recalcula su propio promedio
 * ponderado usando ese costo como el "entrante".
 */
@Injectable()
export class CreateStockTransferUseCase {
  constructor(
    private readonly warehouseRepository: WarehouseRepository,
    private readonly stockRepository: StockRepository,
    private readonly stockMovementRepository: StockMovementRepository,
    private readonly itemRepository: ItemRepository,
    private readonly companyRepository: CompanyRepository,
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

      const fromStock = await this.stockRepository.findByItemAndWarehouse(
        input.itemId,
        input.fromWarehouseId,
        ctx,
      );
      const fromQuantity = fromStock ? new Decimal(fromStock.quantity) : new Decimal(0);
      const fromAverageCost = fromStock ? new Decimal(fromStock.averageCost) : new Decimal(0);
      const newFromQuantity = fromQuantity.minus(quantity);

      if (newFromQuantity.isNegative()) {
        const company = await this.companyRepository.findById(input.companyId, ctx);
        if (!company?.allowNegativeStock) {
          throw new InsufficientStockError();
        }
      }

      await this.stockRepository.upsert(
        {
          companyId: input.companyId,
          itemId: input.itemId,
          warehouseId: input.fromWarehouseId,
          quantity: newFromQuantity.toFixed(3),
          averageCost: fromAverageCost.toFixed(4),
        },
        ctx,
      );

      const outMovement = await this.stockMovementRepository.create(
        {
          id: uuidv7(),
          companyId: input.companyId,
          itemId: input.itemId,
          warehouseId: input.fromWarehouseId,
          type: 'TRANSFER_OUT',
          quantity: quantity.toFixed(3),
          unitCost: fromAverageCost.toFixed(4),
          reason: input.reason,
          transferGroupId,
          userId: input.requestingUserId,
        },
        ctx,
      );

      const toStock = await this.stockRepository.findByItemAndWarehouse(
        input.itemId,
        input.toWarehouseId,
        ctx,
      );
      const toQuantity = toStock ? new Decimal(toStock.quantity) : new Decimal(0);
      const toAverageCost = toStock ? new Decimal(toStock.averageCost) : new Decimal(0);
      const newToQuantity = toQuantity.plus(quantity);
      const newToAverageCost = newToQuantity.isZero()
        ? new Decimal(0)
        : toQuantity
            .times(toAverageCost)
            .plus(quantity.times(fromAverageCost))
            .dividedBy(newToQuantity);

      await this.stockRepository.upsert(
        {
          companyId: input.companyId,
          itemId: input.itemId,
          warehouseId: input.toWarehouseId,
          quantity: newToQuantity.toFixed(3),
          averageCost: newToAverageCost.toFixed(4),
        },
        ctx,
      );

      const inMovement = await this.stockMovementRepository.create(
        {
          id: uuidv7(),
          companyId: input.companyId,
          itemId: input.itemId,
          warehouseId: input.toWarehouseId,
          type: 'TRANSFER_IN',
          quantity: quantity.toFixed(3),
          unitCost: fromAverageCost.toFixed(4),
          reason: input.reason,
          transferGroupId,
          userId: input.requestingUserId,
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
