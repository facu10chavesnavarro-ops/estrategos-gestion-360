import { StockMovementEntity, StockMovementType } from '../entities/stock-movement.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreateStockMovementInput {
  id: string;
  companyId: string;
  itemId: string;
  warehouseId: string;
  type: StockMovementType;
  quantity: string;
  unitCost: string;
  reason?: string;
  transferGroupId?: string;
  userId: string;
}

export interface ListStockMovementsFilters {
  itemId?: string;
  type?: StockMovementType;
  from?: Date;
  to?: Date;
}

export abstract class StockMovementRepository {
  abstract create(
    input: CreateStockMovementInput,
    ctx?: TransactionContext,
  ): Promise<StockMovementEntity>;
  abstract findAllByWarehouse(
    warehouseId: string,
    filters: ListStockMovementsFilters,
  ): Promise<StockMovementEntity[]>;
}
