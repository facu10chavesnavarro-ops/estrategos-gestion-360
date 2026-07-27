/** Snapshot de impuesto aplicado a una línea (RN-VOU-05) — tasa y monto congelados. */
export interface VoucherLineTaxData {
  readonly taxId: string;
  readonly rate: string;
  readonly amount: string;
}

export class VoucherLineEntity {
  constructor(
    public readonly id: string,
    public readonly lineNumber: number,
    public readonly itemId: string | null,
    public readonly description: string,
    public readonly quantity: string,
    public readonly unitPrice: string,
    public readonly discountPercentage: string,
    public readonly subtotal: string,
    public readonly taxes: VoucherLineTaxData[],
  ) {}
}

/** RN-VOU-01 a 12. Inmutable una vez creado (RN-VOU-03). */
export class VoucherEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly branchId: string,
    public readonly pointOfSaleId: string,
    public readonly voucherTypeId: string,
    public readonly number: number,
    public readonly partyId: string,
    public readonly warehouseId: string | null,
    public readonly issueDate: Date,
    public readonly currency: string,
    public readonly exchangeRate: string,
    public readonly relatedVoucherId: string | null,
    public readonly subtotal: string,
    public readonly taxTotal: string,
    public readonly total: string,
    public readonly cae: string | null,
    public readonly caeExpirationDate: Date | null,
    public readonly createdByUserId: string,
    public readonly createdAt: Date,
    public readonly lines: VoucherLineEntity[],
  ) {}
}
