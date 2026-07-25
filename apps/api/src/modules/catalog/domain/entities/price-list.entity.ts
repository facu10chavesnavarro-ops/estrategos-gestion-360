export class PriceListEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly name: string,
    public readonly currency: string,
    public readonly isDefault: boolean,
    public readonly validFrom: Date,
    public readonly validTo: Date | null,
    public readonly isActive: boolean,
  ) {}
}

export class PriceListItemEntity {
  constructor(
    public readonly priceListId: string,
    public readonly itemId: string,
    public readonly price: string,
  ) {}
}
