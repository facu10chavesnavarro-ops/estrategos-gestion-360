/**
 * Error de dominio compartido: el rol del usuario no autoriza la operación.
 * Reubicado desde modules/companies (ver docs/sprint-1/02-usuarios-roles-permisos-invitaciones.md §0.1)
 * porque más de un módulo necesita el mismo chequeo de autorización por rol.
 */
export class RoleNotAuthorizedError extends Error {
  constructor() {
    super('El rol del usuario no autoriza esta operación.');
    this.name = 'RoleNotAuthorizedError';
  }
}
