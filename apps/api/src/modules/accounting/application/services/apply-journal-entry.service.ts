import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { ChartOfAccountRepository } from '../../domain/repositories/chart-of-account.repository';
import { JournalEntryRepository } from '../../domain/repositories/journal-entry.repository';
import {
  JournalEntryEntity,
  JournalEntryOrigin,
  JournalEntrySourceType,
} from '../../domain/entities/journal-entry.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { uuidv7 } from '../../../../common/infrastructure/id/uuid-v7';
import {
  EmptyJournalEntryLinesError,
  UnbalancedJournalEntryError,
  InvalidJournalEntryAccountError,
} from '../../domain/errors/accounting.errors';

export interface ApplyJournalEntryLineInput {
  accountId: string;
  debit: string;
  credit: string;
  description?: string;
}

export interface ApplyJournalEntryInput {
  companyId: string;
  date: Date;
  description: string;
  currency: string;
  exchangeRate: string;
  origin: JournalEntryOrigin;
  sourceType?: JournalEntrySourceType;
  sourceId?: string;
  reversalOfEntryId?: string;
  createdByUserId: string;
  lines: ApplyJournalEntryLineInput[];
}

/**
 * Motor único de asientos: valida balanceo (RN-ACC-03) y que cada cuenta
 * exista en la empresa y sea imputable (RN-ACC-01) antes de persistir.
 * Recibe `ctx` ya abierto — igual que Apply*MovementService — para que
 * `CreateVoucherUseCase`/`CreatePaymentUseCase`/asientos manuales lo
 * combinen atómicamente con el resto de sus escrituras.
 */
@Injectable()
export class ApplyJournalEntryService {
  constructor(
    private readonly chartOfAccountRepository: ChartOfAccountRepository,
    private readonly journalEntryRepository: JournalEntryRepository,
  ) {}

  async apply(input: ApplyJournalEntryInput, ctx: TransactionContext): Promise<JournalEntryEntity> {
    if (!input.lines || input.lines.length < 2) {
      throw new EmptyJournalEntryLinesError();
    }

    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);
    for (const line of input.lines) {
      const account = await this.chartOfAccountRepository.findById(
        line.accountId,
        input.companyId,
        ctx,
      );
      if (!account || !account.allowsMovements || !account.isActive) {
        throw new InvalidJournalEntryAccountError();
      }
      totalDebit = totalDebit.plus(line.debit);
      totalCredit = totalCredit.plus(line.credit);
    }

    if (!totalDebit.equals(totalCredit)) {
      throw new UnbalancedJournalEntryError();
    }

    return this.journalEntryRepository.create(
      {
        id: uuidv7(),
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
        lines: input.lines.map((line) => ({
          id: uuidv7(),
          accountId: line.accountId,
          debit: new Decimal(line.debit).toFixed(2),
          credit: new Decimal(line.credit).toFixed(2),
          description: line.description,
        })),
      },
      ctx,
    );
  }
}
