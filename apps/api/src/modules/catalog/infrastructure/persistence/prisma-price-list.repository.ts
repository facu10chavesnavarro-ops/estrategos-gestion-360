import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  PriceListRepository,
  CreatePriceListInput,
  UpdatePriceListInput,
  ListPriceListsFilters,
} from '../../domain/repositories/price-list.repository';
import { PriceListEntity, PriceListItemEntity } from '../../domain/entities/price-list.entity';
import { PriceListMapper } from '../mappers/price-list.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaPriceListRepository extends PriceListRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreatePriceListInput, ctx?: TransactionContext): Promise<PriceListEntity> {
    const raw = await resolveClient(this.prisma, ctx).priceList.create({
      data: {
        companyId: input.companyId,
        name: input.name,
        currency: input.currency,
        isDefault: input.isDefault,
        validFrom: input.validFrom,
        validTo: input.validTo,
      },
    });
    return PriceListMapper.toDomain(raw);
  }

  async findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<PriceListEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).priceList.findFirst({
      where: { id, companyId },
    });
    return raw ? PriceListMapper.toDomain(raw) : null;
  }

  async findAllByCompany(
    companyId: string,
    filters: ListPriceListsFilters,
  ): Promise<PriceListEntity[]> {
    const where: Prisma.PriceListWhereInput = { companyId };
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    const raws = await this.prisma.priceList.findMany({ where, orderBy: { name: 'asc' } });
    return raws.map(PriceListMapper.toDomain);
  }

  async update(
    id: string,
    input: UpdatePriceListInput,
    ctx?: TransactionContext,
  ): Promise<PriceListEntity> {
    const raw = await resolveClient(this.prisma, ctx).priceList.update({
      where: { id },
      data: input,
    });
    return PriceListMapper.toDomain(raw);
  }

  async setActive(
    id: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<PriceListEntity> {
    const raw = await resolveClient(this.prisma, ctx).priceList.update({
      where: { id },
      data: { isActive },
    });
    return PriceListMapper.toDomain(raw);
  }

  async clearDefaultForCompany(
    companyId: string,
    exceptId: string | undefined,
    ctx?: TransactionContext,
  ): Promise<void> {
    await resolveClient(this.prisma, ctx).priceList.updateMany({
      where: { companyId, isDefault: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
      data: { isDefault: false },
    });
  }

  async findItem(
    priceListId: string,
    itemId: string,
    ctx?: TransactionContext,
  ): Promise<PriceListItemEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).priceListItem.findUnique({
      where: { priceListId_itemId: { priceListId, itemId } },
    });
    return raw ? PriceListMapper.itemToDomain(raw) : null;
  }

  async listItems(
    priceListId: string,
    ctx?: TransactionContext,
  ): Promise<PriceListItemEntity[]> {
    const raws = await resolveClient(this.prisma, ctx).priceListItem.findMany({
      where: { priceListId },
    });
    return raws.map(PriceListMapper.itemToDomain);
  }

  async upsertItem(
    priceListId: string,
    itemId: string,
    price: string,
    ctx?: TransactionContext,
  ): Promise<PriceListItemEntity> {
    const raw = await resolveClient(this.prisma, ctx).priceListItem.upsert({
      where: { priceListId_itemId: { priceListId, itemId } },
      create: { priceListId, itemId, price },
      update: { price },
    });
    return PriceListMapper.itemToDomain(raw);
  }

  async removeItem(priceListId: string, itemId: string, ctx?: TransactionContext): Promise<void> {
    await resolveClient(this.prisma, ctx).priceListItem.delete({
      where: { priceListId_itemId: { priceListId, itemId } },
    });
  }
}
