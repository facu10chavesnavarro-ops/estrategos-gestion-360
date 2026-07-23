import { UserEntity } from '../entities/user.entity';

/**
 * Puerto: la capa de aplicación depende de esta interfaz, nunca de Prisma
 * directamente. La implementación concreta vive en infrastructure/persistence.
 */
export abstract class UserRepository {
  abstract findByEmail(email: string): Promise<UserEntity | null>;
  abstract findById(id: string): Promise<UserEntity | null>;
  abstract updateLastLogin(id: string): Promise<void>;
}
