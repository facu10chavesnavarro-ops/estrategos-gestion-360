import { Injectable } from '@nestjs/common';
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
import { CreateStockAdjustmentUseCaseInput } from '../dto/stock-movement.dto';
import { WarehouseNotFoundError } from '../../domain/errors/warehouse.errors';
import { ItemNotFoundError } from '../../../catalog/domain/errors/item.errors';
import {
  ItemDoesNotTrackStockError,
  InsufficientStockError,
  MissingReasonError,
  MissingUnitCostError,
  InvalidQuantityError,
} from '../../domain/errors/stock-movement.errors';

/**
 * Alta/baja manual de stock (RN-STK-05/06/07/13). En Sprint 3.2 es el único
 * origen de `StockMovement` junto con las transferencias — Sprint 3.3
 * (Comprobantes) agregará `PURCHASE_IN`/`SALE_OUT` desde Ventas/Compras.
 */
@Injectable()
export class CreateStockAdjustmentUseCase {
  constructor(
    private readonly warehouseRepository: WarehouseRepository,
    private readonly stockRepository: StockRepository,
    private readonly stockMovementRepository: StockMovementRepository,
    private readonly itemRepository: ItemRepository,
    private readonly companyRepository: CompanyRepository,
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
      const currentStock = await this.stockRepository.findByItemAndWarehouse(
        input.itemId,
        input.warehouseId,
        ctx,
      );
      const currentQuantity = currentStock ? new Decimal(currentStock.quantity) : new Decimal(0);
      const currentAverageCost = currentStock
        ? new Decimal(currentStock.averageCost)
        : new Decimal(0);

      let newQuantity: Decimal;
      let newAverageCost: Decimal;
      let movementUnitCost: Decimal;
      const movementType = input.direction === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';

      if (input.direction === 'IN') {
        const incomingCost = new Decimal(input.unitCost as string);
        newQuantity = currentQuantity.plus(quantity);
        // RN-STK-05: promedio ponderado.
        newAverageCost = newQuantity.isZero()
          ? new Decimal(0)
          : currentQuantity
              .times(currentAverageCost)
              .plus(quantity.times(incomingCost))
              .dividedBy(newQuantity);
        movementUnitCost = incomingCost;
      } else {
        newQuantity = currentQuantity.minus(quantity);
        newAverageCost = currentAverageCost; // RN-STK-05: una salida no modifica el promedio.
        movementUnitCost = currentAverageCost;

        if (newQuantity.isNegative()) {
          const company = await this.companyRepository.findById(input.companyId, ctx);
          if (!company?.allowNegativeStock) {
            throw new InsufficientStockError();
          }
        }
      }

      await this.stockRepository.upsert(
        {
          companyId: input.companyId,
          itemId: input.itemId,
          warehouseId: input.warehouseId,
          quantity: newQuantity.toFixed(3),
          averageCost: newAverageCost.toFixed(4),
        },
        ctx,
      );

      const movement = await this.stockMovementRepository.create(
        {
          id: uuidv7(),
          companyId: input.companyId,
          itemId: input.itemId,
          warehouseId: input.warehouseId,
          type: movementType,
          quantity: quantity.toFixed(3),
          unitCost: movementUnitCost.toFixed(4),
          reason: input.reason,
          userId: input.requestingUserId,
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
