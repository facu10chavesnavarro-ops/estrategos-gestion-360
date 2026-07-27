export class CategoryEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly parentId: string | null,
    public readonly name: string,
    public readonly isActive: boolean,
    public readonly salesAccountId: string | null,
    public readonly purchasesAccountId: string | null,
  ) {}
}
