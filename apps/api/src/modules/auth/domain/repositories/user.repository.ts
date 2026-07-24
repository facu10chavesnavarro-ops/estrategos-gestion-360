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
}
