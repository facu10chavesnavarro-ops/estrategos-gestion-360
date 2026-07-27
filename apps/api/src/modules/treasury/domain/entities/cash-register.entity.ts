export class CashRegisterEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly branchId: string,
    public readonly name: string,
    public readonly isActive: boolean,
  ) {}
}
