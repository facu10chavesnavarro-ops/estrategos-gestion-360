/** Proyección de lectura: CompanyUser + datos de User y Role ya resueltos. */
export class CompanyMemberEntity {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly fullName: string,
    public readonly roleId: string,
    public readonly roleName: string,
    public readonly isActive: boolean,
  ) {}
}
