import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  CategoryRepository,
  CreateCategoryInput,
  UpdateCategoryInput,
  ListCategoriesFilters,
} from '../../domain/repositories/category.repository';
import { CategoryEntity } from '../../domain/entities/category.entity';
import { CategoryMapper } from '../mappers/category.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaCategoryRepository extends CategoryRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreateCategoryInput, ctx?: TransactionContext): Promise<CategoryEntity> {
    const raw = await resolveClient(this.prisma, ctx).category.create({
      data: {
        companyId: input.companyId,
        parentId: input.parentId,
        name: input.name,
      },
    });
    return CategoryMapper.toDomain(raw);
  }

  async findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<CategoryEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).category.findFirst({
      where: { id, companyId },
    });
    return raw ? CategoryMapper.toDomain(raw) : null;
  }

  async findAllByCompany(
    companyId: string,
    filters: ListCategoriesFilters,
  ): Promise<CategoryEntity[]> {
    const where: Prisma.CategoryWhereInput = { companyId };
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    const raws = await this.prisma.category.findMany({ where, orderBy: { name: 'asc' } });
    return raws.map(CategoryMapper.toDomain);
  }

  async update(
    id: string,
    input: UpdateCategoryInput,
    ctx?: TransactionContext,
  ): Promise<CategoryEntity> {
    const raw = await resolveClient(this.prisma, ctx).category.update({
      where: { id },
      data: input,
    });
    return CategoryMapper.toDomain(raw);
  }

  async setActive(
    id: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<CategoryEntity> {
    const raw = await resolveClient(this.prisma, ctx).category.update({
      where: { id },
      data: { isActive },
    });
    return CategoryMapper.toDomain(raw);
  }
}
