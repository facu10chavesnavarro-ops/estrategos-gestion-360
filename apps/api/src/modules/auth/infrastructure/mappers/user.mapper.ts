import { User as PrismaUser } from '@prisma/client';
import { UserEntity } from '../../domain/entities/user.entity';

export class UserMapper {
  static toDomain(raw: PrismaUser): UserEntity {
    return new UserEntity(
      raw.id,
      raw.email,
      raw.passwordHash,
      raw.fullName,
      raw.isActive,
    );
  }
}
