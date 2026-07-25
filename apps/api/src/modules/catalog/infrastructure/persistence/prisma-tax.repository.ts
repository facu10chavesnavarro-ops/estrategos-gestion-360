import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  TaxRepository,
  CreateTaxInput,
  ListTaxesFilters,
} from '../../domain/repositories/tax.repository';
import { TaxEntity } from '../../domain/entities/tax.entity';
import { TaxMapper } from '../mappers/tax.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaTaxRepository extends TaxRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreateTaxInput, ctx?: TransactionContext): Promise<TaxEntity> {
    const raw = await resolveClient(this.prisma, ctx).tax.create({
      data: {
        companyId: input.companyId,
        name: input.name,
        type: input.type,
        rate: input.rate,
        validFrom: input.validFrom,
        validTo: input.validTo,
      },
    });
    return TaxMapper.toDomain(raw);
  }

  async findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<TaxEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).tax.findFirst({
      where: { id, companyId },
    });
    return raw ? TaxMapper.toDomain(raw) : null;
  }

  async findAllByCompany(companyId: string, filters: ListTaxesFilters): Promise<TaxEntity[]> {
    const where: Prisma.TaxWhereInput = { companyId };
    if (filters.onlyCurrentlyValid) {
      const now = new Date();
      where.validFrom = { lte: now };
      where.OR = [{ validTo: null }, { validTo: { gt: now } }];
    }
    const raws = await this.prisma.tax.findMany({ where, orderBy: { name: 'asc' } });
    return raws.map(TaxMapper.toDomain);
  }

  async updateName(id: string, name: string, ctx?: TransactionContext): Promise<TaxEntity> {
    const raw = await resolveClient(this.prisma, ctx).tax.update({
      where: { id },
      data: { name },
    });
    return TaxMapper.toDomain(raw);
  }

  async close(id: string, validTo: Date, ctx?: TransactionContext): Promise<TaxEntity> {
    const raw = await resolveClient(this.prisma, ctx).tax.update({
      where: { id },
      data: { validTo },
    });
    return TaxMapper.toDomain(raw);
  }
}
