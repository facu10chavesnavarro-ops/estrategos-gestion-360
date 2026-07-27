import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { StockRepository } from '../../domain/repositories/stock.repository';
import { StockMovementRepository } from '../../domain/repositories/stock-movement.repository';
import { StockMovementEntity, StockMovementType } from '../../domain/entities/stock-movement.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { uuidv7 } from '../../../../common/infrastructure/id/uuid-v7';
import { InsufficientStockError } from '../../domain/errors/stock-movement.errors';

export interface ApplyStockMovementInput {
  companyId: string;
  itemId: string;
  warehouseId: string;
  direction: 'IN' | 'OUT';
  type: StockMovementType;
  /** Decimal string, siempre positivo — el signo lo da `direction`. */
  quantity: string;
  /** Obligatorio si `direction = 'IN'`; ignorado si `direction = 'OUT'`. */
  unitCost?: string;
  reason?: string;
  transferGroupId?: string;
  voucherId?: string;
  userId: string;
  /** RN-STK-06, ya resuelto por el caller (lee `Company.allowNegativeStock`). */
  allowNegativeStock: boolean;
}

/**
 * Aplica un movimiento de stock (RN-STK-04/05/06): recalcula `Stock` con
 * costeo por Promedio Ponderado y registra el `StockMovement`. Recibe el
 * `ctx` en vez de abrir su propia transacción — el caller (un caso de uso)
 * es quien decide el límite de la transacción, para poder combinar esto con
 * otras escrituras (crear un Comprobante, un ajuste, un par de transferencia)
 * de forma atómica. Ver docs/sprint-3/03-comprobantes.md §0.3.
 */
@Injectable()
export class ApplyStockMovementService {
  constructor(
    private readonly stockRepository: StockRepository,
    private readonly stockMovementRepository: StockMovementRepository,
  ) {}

  async apply(
    input: ApplyStockMovementInput,
    ctx: TransactionContext,
  ): Promise<StockMovementEntity> {
    const quantity = new Decimal(input.quantity);
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

      if (newQuantity.isNegative() && !input.allowNegativeStock) {
        throw new InsufficientStockError();
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

    return this.stockMovementRepository.create(
      {
        id: uuidv7(),
        companyId: input.companyId,
        itemId: input.itemId,
        warehouseId: input.warehouseId,
        type: input.type,
        quantity: quantity.toFixed(3),
        unitCost: movementUnitCost.toFixed(4),
        reason: input.reason,
        transferGroupId: input.transferGroupId,
        voucherId: input.voucherId,
        userId: input.userId,
      },
      ctx,
    );
  }
}
