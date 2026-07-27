import { Injectable } from '@nestjs/common';
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
import { CreateStockAdjustmentUseCaseInput } from '../dto/stock-movement.dto';
import { WarehouseNotFoundError } from '../../domain/errors/warehouse.errors';
import { ItemNotFoundError } from '../../../catalog/domain/errors/item.errors';
import {
  ItemDoesNotTrackStockError,
  MissingReasonError,
  MissingUnitCostError,
  InvalidQuantityError,
} from '../../domain/errors/stock-movement.errors';

/**
 * Alta/baja manual de stock (RN-STK-05/06/07/13). En Sprint 3.2 es el único
 * origen de `StockMovement` junto con las transferencias — Sprint 3.3
 * (Comprobantes) agrega `PURCHASE_IN`/`SALE_OUT`/etc. desde Ventas/Compras,
 * reutilizando `ApplyStockMovementService` (ver docs/sprint-3/03-comprobantes.md §0.3).
 */
@Injectable()
export class CreateStockAdjustmentUseCase {
  constructor(
    private readonly warehouseRepository: WarehouseRepository,
    private readonly itemRepository: ItemRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly applyStockMovementService: ApplyStockMovementService,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: CreateStockAdjustmentUseCaseInput): Promise<StockMovementEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const warehouse = await this.warehouseRepository.findById(
      input.warehouseId,
      input.companyId,
    );
    if (!warehouse) {
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

    if (input.direction === 'IN' && input.unitCost === undefined) {
      throw new MissingUnitCostError();
    }
    if (input.direction === 'OUT' && !input.reason) {
      throw new MissingReasonError();
    }

    return this.unitOfWork.run(async (ctx) => {
      let allowNegativeStock = true;
      if (input.direction === 'OUT') {
        const company = await this.companyRepository.findById(input.companyId, ctx);
        allowNegativeStock = company?.allowNegativeStock ?? false;
      }

      const movement = await this.applyStockMovementService.apply(
        {
          companyId: input.companyId,
          itemId: input.itemId,
          warehouseId: input.warehouseId,
          direction: input.direction,
          type: input.direction === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
          quantity: input.quantity,
          unitCost: input.unitCost,
          reason: input.reason,
          userId: input.requestingUserId,
          allowNegativeStock,
        },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: input.direction === 'IN' ? 'stock.adjustment_in' : 'stock.adjustment_out',
          entityType: 'StockMovement',
          entityId: movement.id,
          metadata: {
            itemId: input.itemId,
            warehouseId: input.warehouseId,
            quantity: input.quantity,
            reason: input.reason,
          },
        },
        ctx,
      );

      return movement;
    });
  }
}
