/** Vista combinada: datos del Party (compartidos) + lo específico del rol Proveedor. */
export class SupplierEntity {
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
    public readonly bankName: string | null,
    public readonly bankAccountHolder: string | null,
    public readonly bankCbu: string | null,
    public readonly isActive: boolean,
  ) {}
}
