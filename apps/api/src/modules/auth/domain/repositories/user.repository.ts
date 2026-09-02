import { UserEntity } from '../entities/user.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  fullName: string;
}

/**
 * Puerto: la capa de aplicación depende de esta interfaz, nunca de Prisma
 * directamente. La implementación concreta vive en infrastructure/persistence.
 */
export abstract class UserRepository {
  abstract findByEmail(email: string, ctx?: TransactionContext): Promise<UserEntity | null>;
  abstract findById(id: string, ctx?: TransactionContext): Promise<UserEntity | null>;
  abstract updateLastLogin(id: string, ctx?: TransactionContext): Promise<void>;
  abstract create(input: CreateUserInput, ctx?: TransactionContext): Promise<UserEntity>;

  /**
   * Auditoría de seguridad (hallazgo Bajo #7). Lectura liviana (un solo
   * campo) porque JwtAuthGuard la llama en cada request autenticado.
   */
  abstract getTokensInvalidatedAt(id: string, ctx?: TransactionContext): Promise<Date | null>;
  /** Invalida todos los access tokens en circulación del usuario (logout). */
  abstract invalidateTokensNow(id: string, ctx?: TransactionContext): Promise<void>;
}
