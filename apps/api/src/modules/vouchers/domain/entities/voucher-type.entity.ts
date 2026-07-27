export type VoucherFlow = 'SALE' | 'PURCHASE';
export type StockEffect = 'IN' | 'OUT' | 'NONE';
export type CurrentAccountEffect = 'DEBIT' | 'CREDIT' | 'NONE';

export class VoucherTypeEntity {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly name: string,
    public readonly flow: VoucherFlow,
    public readonly affectsStock: StockEffect,
    public readonly affectsCurrentAccount: CurrentAccountEffect,
    public readonly requiresCae: boolean,
    public readonly isCreditNote: boolean,
    public readonly relatedVoucherRequired: boolean,
    public readonly isActive: boolean,
  ) {}
}
