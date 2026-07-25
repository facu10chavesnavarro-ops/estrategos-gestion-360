import { Category as PrismaCategory } from '@prisma/client';
import { CategoryEntity } from '../../domain/entities/category.entity';

export class CategoryMapper {
  static toDomain(raw: PrismaCategory): CategoryEntity {
    return new CategoryEntity(raw.id, raw.companyId, raw.parentId, raw.name, raw.isActive);
  }
}
