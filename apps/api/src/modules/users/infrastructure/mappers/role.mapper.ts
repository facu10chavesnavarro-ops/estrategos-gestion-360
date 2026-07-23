import { Role as PrismaRole } from '@prisma/client';
import { RoleEntity } from '../../domain/entities/role.entity';

export class RoleMapper {
  static toDomain(raw: PrismaRole): RoleEntity {
    return new RoleEntity(raw.id, raw.name, raw.description);
  }
}
