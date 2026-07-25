import { StockEntity } from '../entities/stock.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface UpsertStockInput {
  companyId: string;
  itemId: string;
  warehouseId: string;
  quantity: string;
  averageCost: string;
}

export interface ListStockFilters {
  itemId?: string;
}

/** RN-STK-04: nunca se escribe desde un caso de uso salvo `upsert`, siempre
 * dentro de la misma transacción que crea el `StockMovement` que lo motiva. */
export abstract class StockRepository {
  abstract findByItemAndWarehouse(
    itemId: string,
    warehouseId: string,
    ctx?: TransactionContext,
  ): Promise<StockEntity | null>;
  abstract findAllByWarehouse(
    warehouseId: string,
    filters: ListStockFilters,
  ): Promise<StockEntity[]>;
  abstract upsert(input: UpsertStockInput, ctx?: TransactionContext): Promise<StockEntity>;
}
