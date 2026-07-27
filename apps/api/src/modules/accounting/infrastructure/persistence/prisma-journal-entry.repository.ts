import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  JournalEntryRepository,
  CreateJournalEntryInput,
  ListJournalEntriesFilters,
  AccountLedgerMovement,
} from '../../domain/repositories/journal-entry.repository';
import { JournalEntryEntity } from '../../domain/entities/journal-entry.entity';
import { JournalEntryMapper } from '../mappers/journal-entry.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaJournalEntryRepository extends JournalEntryRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(
    input: CreateJournalEntryInput,
    ctx?: TransactionContext,
  ): Promise<JournalEntryEntity> {
    const raw = await resolveClient(this.prisma, ctx).journalEntry.create({
      data: {
        id: input.id,
        companyId: input.companyId,
        date: input.date,
        description: input.description,
        currency: input.currency,
        exchangeRate: input.exchangeRate,
        origin: input.origin,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        reversalOfEntryId: input.reversalOfEntryId,
        createdByUserId: input.createdByUserId,
        lines: {
          create: input.lines.map((line) => ({
            id: line.id,
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
            description: line.description,
          })),
        },
      },
      include: { lines: true },
    });
    return JournalEntryMapper.toDomain(raw);
  }

  async findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<JournalEntryEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).journalEntry.findFirst({
      where: { id, companyId },
      include: { lines: true },
    });
    return raw ? JournalEntryMapper.toDomain(raw) : null;
  }

  async findAllByCompany(
    companyId: string,
    filters: ListJournalEntriesFilters,
  ): Promise<JournalEntryEntity[]> {
    const where: Prisma.JournalEntryWhereInput = { companyId };
    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) where.date.gte = filters.from;
      if (filters.to) where.date.lte = filters.to;
    }
    const raws = await this.prisma.journalEntry.findMany({
      where,
      include: { lines: true },
      orderBy: { date: 'asc' },
    });
    return raws.map(JournalEntryMapper.toDomain);
  }

  async findLedgerByAccount(
    accountId: string,
    companyId: string,
  ): Promise<AccountLedgerMovement[]> {
    const lines = await this.prisma.journalEntryLine.findMany({
      where: { accountId, journalEntry: { companyId } },
      include: { journalEntry: true },
      orderBy: { journalEntry: { date: 'asc' } },
    });
    return lines.map((line) => ({
      journalEntryId: line.journalEntryId,
      date: line.journalEntry.date,
      description: line.description ?? line.journalEntry.description,
      debit: line.debit.toString(),
      credit: line.credit.toString(),
    }));
  }

  async existsReversalOf(entryId: string, ctx?: TransactionContext): Promise<boolean> {
    const found = await resolveClient(this.prisma, ctx).journalEntry.findFirst({
      where: { reversalOfEntryId: entryId },
      select: { id: true },
    });
    return found !== null;
  }
}
