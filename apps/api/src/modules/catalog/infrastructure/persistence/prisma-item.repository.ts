import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  ItemRepository,
  CreateItemInput,
  UpdateItemInput,
  ListItemsFilters,
} from '../../domain/repositories/item.repository';
import { ItemEntity } from '../../domain/entities/item.entity';
import { ItemMapper } from '../mappers/item.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

const WITH_TAXES = { include: { itemTaxes: true } } as const;

@Injectable()
export class PrismaItemRepository extends ItemRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreateItemInput, ctx?: TransactionContext): Promise<ItemEntity> {
    const raw = await resolveClient(this.prisma, ctx).item.create({
      data: {
        companyId: input.companyId,
        type: input.type,
        sku: input.sku,
        name: input.name,
        description: input.description,
        categoryId: input.categoryId,
        unitOfMeasure: input.unitOfMeasure,
        tracksStock: input.tracksStock,
        minimumStock: input.minimumStock,
        itemTaxes: { create: input.taxIds.map((taxId) => ({ taxId })) },
      },
      ...WITH_TAXES,
    });
    return ItemMapper.toDomain(raw);
  }

  async findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<ItemEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).item.findFirst({
      where: { id, companyId },
      ...WITH_TAXES,
    });
    return raw ? ItemMapper.toDomain(raw) : null;
  }

  async findBySku(
    companyId: string,
    sku: string,
    ctx?: TransactionContext,
  ): Promise<ItemEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).item.findUnique({
      where: { companyId_sku: { companyId, sku } },
      ...WITH_TAXES,
    });
    return raw ? ItemMapper.toDomain(raw) : null;
  }

  async findAllByCompany(companyId: string, filters: ListItemsFilters): Promise<ItemEntity[]> {
    const where: Prisma.ItemWhereInput = { companyId };
    if (filters.type !== undefined) {
      where.type = filters.type;
    }
    if (filters.categoryId !== undefined) {
      where.categoryId = filters.categoryId;
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    const raws = await this.prisma.item.findMany({ where, ...WITH_TAXES, orderBy: { name: 'asc' } });
    return raws.map(ItemMapper.toDomain);
  }

  async update(
    id: string,
    input: UpdateItemInput,
    ctx?: TransactionContext,
  ): Promise<ItemEntity> {
    const client = resolveClient(this.prisma, ctx);
    const { taxIds, ...patch } = input;

    if (taxIds !== undefined) {
      await client.itemTax.deleteMany({ where: { itemId: id } });
      if (taxIds.length > 0) {
        await client.itemTax.createMany({
          data: taxIds.map((taxId) => ({ itemId: id, taxId })),
        });
      }
    }

    const raw = await client.item.update({
      where: { id },
      data: patch,
      ...WITH_TAXES,
    });
    return ItemMapper.toDomain(raw);
  }

  async setActive(id: string, isActive: boolean, ctx?: TransactionContext): Promise<ItemEntity> {
    const raw = await resolveClient(this.prisma, ctx).item.update({
      where: { id },
      data: { isActive },
      ...WITH_TAXES,
    });
    return ItemMapper.toDomain(raw);
  }
}
