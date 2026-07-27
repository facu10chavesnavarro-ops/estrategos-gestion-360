export class PointOfSaleEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly branchId: string,
    public readonly code: string,
    public readonly name: string,
    public readonly isActive: boolean,
  ) {}
}
