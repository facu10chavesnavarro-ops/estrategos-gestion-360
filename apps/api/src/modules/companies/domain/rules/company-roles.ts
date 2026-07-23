import { CompanyRoleNotAuthorizedError } from '../errors/company.errors';

/**
 * RN-EMP-03: quién puede dar de alta una empresa nueva (autorización derivada
 * del tenant, ver docs/sprint-1/01-empresas-sucursales.md sección 0).
 */
export const ROLES_THAT_CAN_CREATE_COMPANY = [
  'Superadministrador',
  'Administrador Estrategos',
] as const;

/**
 * RN-EMP-07: quién puede editar, activar/desactivar una empresa o sus sucursales.
 * Rol asignado por el creador a las empresas nuevas (ver CreateCompanyUseCase).
 */
export const ROLES_THAT_CAN_MANAGE_COMPANY = [
  'Administrador Estrategos',
  'Propietario',
  'Administrador de empresa',
] as const;

export const DEFAULT_ROLE_FOR_COMPANY_CREATOR = 'Administrador Estrategos';

export function assertRoleIn(
  roleName: string,
  allowed: readonly string[],
): void {
  if (!allowed.includes(roleName)) {
    throw new CompanyRoleNotAuthorizedError();
  }
}
