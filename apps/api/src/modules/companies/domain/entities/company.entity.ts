export class CompanyEntity {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly legalName: string,
    public readonly taxId: string | null,
    public readonly taxCondition: string | null,
    public readonly activity: string | null,
    public readonly address: string | null,
    public readonly contactName: string | null,
    public readonly contactEmail: string | null,
    public readonly contactPhone: string | null,
    public readonly logoUrl: string | null,
    public readonly currency: string,
    public readonly timezone: string,
    public readonly isActive: boolean,
  ) {}
}
