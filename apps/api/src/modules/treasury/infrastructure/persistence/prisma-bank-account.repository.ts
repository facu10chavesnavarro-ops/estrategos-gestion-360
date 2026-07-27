import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  BankAccountRepository,
  CreateBankAccountInput,
  UpdateBankAccountInput,
} from '../../domain/repositories/bank-account.repository';
import { BankAccountEntity } from '../../domain/entities/bank-account.entity';
import { BankAccountMapper } from '../mappers/bank-account.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaBankAccountRepository extends BankAccountRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(
    input: CreateBankAccountInput,
    ctx?: TransactionContext,
  ): Promise<BankAccountEntity> {
    const raw = await resolveClient(this.prisma, ctx).bankAccount.create({
      data: {
        companyId: input.companyId,
        bankName: input.bankName,
        accountType: input.accountType,
        accountNumber: input.accountNumber,
        cbu: input.cbu,
        alias: input.alias,
        currency: input.currency,
      },
    });
    return BankAccountMapper.toDomain(raw);
  }

  async findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<BankAccountEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).bankAccount.findFirst({
      where: { id, companyId },
    });
    return raw ? BankAccountMapper.toDomain(raw) : null;
  }

  async findAllByCompany(companyId: string): Promise<BankAccountEntity[]> {
    const raws = await this.prisma.bankAccount.findMany({
      where: { companyId },
      orderBy: { bankName: 'asc' },
    });
    return raws.map(BankAccountMapper.toDomain);
  }

  async update(
    id: string,
    input: UpdateBankAccountInput,
    ctx?: TransactionContext,
  ): Promise<BankAccountEntity> {
    const raw = await resolveClient(this.prisma, ctx).bankAccount.update({
      where: { id },
      data: input,
    });
    return BankAccountMapper.toDomain(raw);
  }

  async setActive(
    id: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<BankAccountEntity> {
    const raw = await resolveClient(this.prisma, ctx).bankAccount.update({
      where: { id },
      data: { isActive },
    });
    return BankAccountMapper.toDomain(raw);
  }
}
