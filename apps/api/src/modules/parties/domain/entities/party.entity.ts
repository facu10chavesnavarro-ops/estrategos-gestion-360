export class PartyEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly legalName: string,
    public readonly taxId: string | null,
    public readonly taxCondition: string | null,
    public readonly email: string | null,
    public readonly phone: string | null,
    public readonly address: string | null,
    public readonly contactName: string | null,
    public readonly notes: string | null,
  ) {}
}
