import { StockMovementType } from '../../domain/entities/stock-movement.entity';

export interface CreateStockAdjustmentUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  warehouseId: string;
  itemId: string;
  direction: 'IN' | 'OUT';
  quantity: string;
  unitCost?: string;
  reason?: string;
}

export interface CreateStockTransferUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  itemId: string;
  quantity: string;
  reason: string;
}

export interface ListStockMovementsUseCaseInput {
  companyId: string;
  warehouseId: string;
  itemId?: string;
  type?: StockMovementType;
  from?: string;
  to?: string;
}
