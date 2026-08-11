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
  /** Presente cuando el movimiento se originó en un Comprobante (Sprint 3.3). */
  voucherId?: string;
  userId: string;
}

export interface ListStockMovementsFilters {
  itemId?: string;
  type?: StockMovementType;
  voucherId?: string;
  from?: Date;
  to?: Date;
}

export abstract class StockMovementRepository {
  abstract create(
    input: CreateStockMovementInput,
    ctx?: TransactionContext,
  ): Promise<StockMovementEntity>;
  /**
   * Escaneado por `companyId` además de `warehouseId` (auditoría de
   * seguridad, hallazgo A1): sin este filtro, un usuario de una empresa
   * podía consultar los movimientos de stock de un depósito de otra
   * empresa pasando su id.
   */
  abstract findAllByWarehouse(
    warehouseId: string,
    companyId: string,
    filters: ListStockMovementsFilters,
  ): Promise<StockMovementEntity[]>;
}
