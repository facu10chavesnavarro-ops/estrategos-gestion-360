import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  ChartOfAccountRepository,
  CreateChartOfAccountInput,
  UpdateChartOfAccountInput,
  ListChartOfAccountsFilters,
} from '../../domain/repositories/chart-of-account.repository';
import { ChartOfAccountEntity } from '../../domain/entities/chart-of-account.entity';
import { ChartOfAccountMapper } from '../mappers/chart-of-account.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaChartOfAccountRepository extends ChartOfAccountRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(
    input: CreateChartOfAccountInput,
    ctx?: TransactionContext,
  ): Promise<ChartOfAccountEntity> {
    const raw = await resolveClient(this.prisma, ctx).chartOfAccount.create({
      data: {
        companyId: input.companyId,
        parentId: input.parentId,
        code: input.code,
        name: input.name,
        type: input.type,
        allowsMovements: input.allowsMovements ?? true,
        isSystemAccount: input.isSystemAccount ?? false,
      },
    });
    return ChartOfAccountMapper.toDomain(raw);
  }

  async findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<ChartOfAccountEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).chartOfAccount.findFirst({
      where: { id, companyId },
    });
    return raw ? ChartOfAccountMapper.toDomain(raw) : null;
  }

  async findByCode(
    companyId: string,
    code: string,
    ctx?: TransactionContext,
  ): Promise<ChartOfAccountEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).chartOfAccount.findFirst({
      where: { companyId, code },
    });
    return raw ? ChartOfAccountMapper.toDomain(raw) : null;
  }

  async findAllByCompany(
    companyId: string,
    filters: ListChartOfAccountsFilters,
  ): Promise<ChartOfAccountEntity[]> {
    const where: Prisma.ChartOfAccountWhereInput = { companyId };
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    const raws = await this.prisma.chartOfAccount.findMany({ where, orderBy: { code: 'asc' } });
    return raws.map(ChartOfAccountMapper.toDomain);
  }

  async update(
    id: string,
    input: UpdateChartOfAccountInput,
    ctx?: TransactionContext,
  ): Promise<ChartOfAccountEntity> {
    const raw = await resolveClient(this.prisma, ctx).chartOfAccount.update({
      where: { id },
      data: input,
    });
    return ChartOfAccountMapper.toDomain(raw);
  }

  async setActive(
    id: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<ChartOfAccountEntity> {
    const raw = await resolveClient(this.prisma, ctx).chartOfAccount.update({
      where: { id },
      data: { isActive },
    });
    return ChartOfAccountMapper.toDomain(raw);
  }
}
