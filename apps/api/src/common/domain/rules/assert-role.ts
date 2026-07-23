import { RoleNotAuthorizedError } from '../errors/authorization.error';

/** Lanza RoleNotAuthorizedError si roleName no está en la lista permitida. */
export function assertRoleIn(
  roleName: string,
  allowed: readonly string[],
): void {
  if (!allowed.includes(roleName)) {
    throw new RoleNotAuthorizedError();
  }
}
