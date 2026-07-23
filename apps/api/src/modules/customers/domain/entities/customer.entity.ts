/** Vista combinada: datos del Party (compartidos) + lo específico del rol Cliente. */
export class CustomerEntity {
  constructor(
    public readonly id: string,
    public readonly partyId: string,
    public readonly companyId: string,
    public readonly legalName: string,
    public readonly taxId: string | null,
    public readonly taxCondition: string | null,
    public readonly email: string | null,
    public readonly phone: string | null,
    public readonly address: string | null,
    public readonly contactName: string | null,
    public readonly notes: string | null,
    public readonly paymentTermDays: number | null,
    public readonly creditLimit: string | null,
    public readonly isActive: boolean,
  ) {}
}
