export type BankAccountType = 'CHECKING' | 'SAVINGS';

export class BankAccountEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly bankName: string,
    public readonly accountType: BankAccountType,
    public readonly accountNumber: string | null,
    public readonly cbu: string | null,
    public readonly alias: string | null,
    public readonly currency: string,
    public readonly isActive: boolean,
  ) {}
}
