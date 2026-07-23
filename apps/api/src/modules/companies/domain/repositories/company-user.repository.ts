export abstract class CompanyUserRepository {
  /** RN-EMP-03: ¿el usuario tiene alguno de estos roles en alguna empresa del tenant dado? */
  abstract hasRoleInTenant(
    userId: string,
    tenantId: string,
    roleNames: readonly string[],
  ): Promise<boolean>;

  /** Crea la membresía userId-companyId con el rol indicado (por nombre de rol). */
  abstract addMembership(
    userId: string,
    companyId: string,
    roleName: string,
  ): Promise<void>;
}
