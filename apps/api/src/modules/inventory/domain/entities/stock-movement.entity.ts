export type StockMovementType =
  | 'PURCHASE_IN'
  | 'SALE_OUT'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'RETURN_IN'
  | 'RETURN_OUT';

export class StockMovementEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly itemId: string,
    public readonly warehouseId: string,
    public readonly type: StockMovementType,
    public readonly quantity: string,
    public readonly unitCost: string,
    public readonly reason: string | null,
    public readonly transferGroupId: string | null,
    public readonly voucherId: string | null,
    public readonly userId: string,
    public readonly createdAt: Date,
  ) {}
}
