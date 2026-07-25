export class StockEntity {
  constructor(
    public readonly companyId: string,
    public readonly itemId: string,
    public readonly warehouseId: string,
    public readonly quantity: string,
    public readonly averageCost: string,
  ) {}
}
