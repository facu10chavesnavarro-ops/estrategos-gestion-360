export type TaxType = 'VAT' | 'PERCEPTION' | 'WITHHOLDING';

export class TaxEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly name: string,
    public readonly type: TaxType,
    public readonly rate: string,
    public readonly validFrom: Date,
    public readonly validTo: Date | null,
  ) {}
}
