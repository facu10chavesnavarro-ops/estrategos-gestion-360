/**
 * Entidad de dominio. No importa nada de Nest ni de Prisma:
 * es una regla dura de la arquitectura (ver docs/ARQUITECTURA.md, sección 2).
 */
export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly fullName: string,
    public readonly isActive: boolean,
    public readonly lastLoginAt: Date | null = null,
  ) {}

  /** Regla de dominio: un usuario inactivo nunca puede autenticarse. */
  canAuthenticate(): boolean {
    return this.isActive;
  }
}
