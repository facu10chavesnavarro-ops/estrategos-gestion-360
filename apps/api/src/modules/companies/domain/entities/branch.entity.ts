export class BranchEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly name: string,
    public readonly address: string | null,
    public readonly phone: string | null,
    public readonly isActive: boolean,
  ) {}
}
