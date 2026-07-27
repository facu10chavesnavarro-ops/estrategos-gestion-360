import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  AccountingSettingsRepository,
  CreateAccountingSettingsInput,
  UpdateAccountingSettingsInput,
} from '../../domain/repositories/accounting-settings.repository';
import { AccountingSettingsEntity } from '../../domain/entities/accounting-settings.entity';
import { AccountingSettingsMapper } from '../mappers/accounting-settings.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaAccountingSettingsRepository extends AccountingSettingsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(
    input: CreateAccountingSettingsInput,
    ctx?: TransactionContext,
  ): Promise<AccountingSettingsEntity> {
    const raw = await resolveClient(this.prisma, ctx).accountingSettings.create({
      data: {
        companyId: input.companyId,
        accountsReceivableId: input.accountsReceivableId,
        accountsPayableId: input.accountsPayableId,
      },
    });
    return AccountingSettingsMapper.toDomain(raw);
  }

  async findByCompany(
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<AccountingSettingsEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).accountingSettings.findUnique({
      where: { companyId },
    });
    return raw ? AccountingSettingsMapper.toDomain(raw) : null;
  }

  async update(
    companyId: string,
    input: UpdateAccountingSettingsInput,
    ctx?: TransactionContext,
  ): Promise<AccountingSettingsEntity> {
    const raw = await resolveClient(this.prisma, ctx).accountingSettings.update({
      where: { companyId },
      data: input,
    });
    return AccountingSettingsMapper.toDomain(raw);
  }
}
