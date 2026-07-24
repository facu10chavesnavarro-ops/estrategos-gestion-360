import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CompanyMembership {
  userId: string;
  email: string;
  fullName: string;
  roleId: string;
  roleName: string;
  isActive: boolean;
}

export interface CompanyMembershipStatus {
  roleId: string;
  isActive: boolean;
}

export abstract class CompanyUserRepository {
  /** RN-EMP-03: ¿el usuario tiene alguno de estos roles en alguna empresa del tenant dado? */
  abstract hasRoleInTenant(
    userId: string,
    tenantId: string,
    roleNames: readonly string[],
    ctx?: TransactionContext,
  ): Promise<boolean>;

  /** Crea la membresía userId-companyId con el rol indicado (por nombre de rol). */
  abstract addMembership(
    userId: string,
    companyId: string,
    roleName: string,
    ctx?: TransactionContext,
  ): Promise<void>;

  /** ¿El email tiene una membresía activa en esta empresa? (RN-USR-05). */
  abstract hasActiveMembershipByEmail(
    email: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<boolean>;

  /** Miembros de una empresa con datos de usuario y rol ya resueltos (P15). */
  abstract findAllByCompanyWithDetails(
    companyId: string,
  ): Promise<CompanyMembership[]>;

  abstract findMembership(
    userId: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<CompanyMembershipStatus | null>;

  abstract updateRole(
    userId: string,
    companyId: string,
    roleId: string,
    ctx?: TransactionContext,
  ): Promise<void>;

  abstract setActive(
    userId: string,
    companyId: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<void>;
}
