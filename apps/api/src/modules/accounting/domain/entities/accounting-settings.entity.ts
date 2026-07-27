export class AccountingSettingsEntity {
  constructor(
    public readonly companyId: string,
    public readonly accountsReceivableId: string,
    public readonly accountsPayableId: string,
  ) {}
}
