export type ItemType = 'PRODUCT' | 'SERVICE';

export class ItemEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly type: ItemType,
    public readonly sku: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly categoryId: string | null,
    public readonly unitOfMeasure: string,
    public readonly tracksStock: boolean,
    public readonly minimumStock: string | null,
    public readonly isActive: boolean,
    public readonly taxIds: string[],
    public readonly longDescription: string | null,
    public readonly barcode: string | null,
    public readonly costPrice: string | null,
  ) {}
}
