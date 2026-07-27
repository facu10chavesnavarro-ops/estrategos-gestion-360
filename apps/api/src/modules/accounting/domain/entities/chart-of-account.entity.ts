export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';

export class ChartOfAccountEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly parentId: string | null,
    public readonly code: string,
    public readonly name: string,
    public readonly type: AccountType,
    public readonly allowsMovements: boolean,
    public readonly isSystemAccount: boolean,
    public readonly isActive: boolean,
  ) {}
}
