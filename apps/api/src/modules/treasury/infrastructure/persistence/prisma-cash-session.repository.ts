import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  CashSessionRepository,
  OpenCashSessionInput,
  CloseCashSessionInput,
} from '../../domain/repositories/cash-session.repository';
import { CashSessionEntity } from '../../domain/entities/cash-session.entity';
import { CashSessionMapper } from '../mappers/cash-session.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaCashSessionRepository extends CashSessionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(
    input: OpenCashSessionInput,
    ctx?: TransactionContext,
  ): Promise<CashSessionEntity> {
    const raw = await resolveClient(this.prisma, ctx).cashSession.create({
      data: {
        cashRegisterId: input.cashRegisterId,
        openedByUserId: input.openedByUserId,
        openingBalance: input.openingBalance,
      },
    });
    return CashSessionMapper.toDomain(raw);
  }

  async findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<CashSessionEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).cashSession.findFirst({
      where: { id, cashRegister: { companyId } },
    });
    return raw ? CashSessionMapper.toDomain(raw) : null;
  }

  async findOpenByCashRegister(
    cashRegisterId: string,
    ctx?: TransactionContext,
  ): Promise<CashSessionEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).cashSession.findFirst({
      where: { cashRegisterId, closedAt: null },
    });
    return raw ? CashSessionMapper.toDomain(raw) : null;
  }

  async findAllByCashRegister(cashRegisterId: string): Promise<CashSessionEntity[]> {
    const raws = await this.prisma.cashSession.findMany({
      where: { cashRegisterId },
      orderBy: { openedAt: 'desc' },
    });
    return raws.map(CashSessionMapper.toDomain);
  }

  async close(
    id: string,
    input: CloseCashSessionInput,
    ctx?: TransactionContext,
  ): Promise<CashSessionEntity> {
    const raw = await resolveClient(this.prisma, ctx).cashSession.update({
      where: { id },
      data: {
        closedByUserId: input.closedByUserId,
        closingBalance: input.closingBalance,
        expectedBalance: input.expectedBalance,
        difference: input.difference,
        closedAt: new Date(),
      },
    });
    return CashSessionMapper.toDomain(raw);
  }
}
