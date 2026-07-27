import {
  JournalEntryEntity,
  JournalEntryOrigin,
  JournalEntrySourceType,
} from '../entities/journal-entry.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreateJournalEntryLineInput {
  id: string;
  accountId: string;
  debit: string;
  credit: string;
  description?: string;
}

export interface CreateJournalEntryInput {
  id: string;
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
  lines: CreateJournalEntryLineInput[];
}

export interface ListJournalEntriesFilters {
  from?: Date;
  to?: Date;
}

export interface AccountLedgerMovement {
  journalEntryId: string;
  date: Date;
  description: string;
  debit: string;
  credit: string;
}

export abstract class JournalEntryRepository {
  abstract create(
    input: CreateJournalEntryInput,
    ctx?: TransactionContext,
  ): Promise<JournalEntryEntity>;
  abstract findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<JournalEntryEntity | null>;
  abstract findAllByCompany(
    companyId: string,
    filters: ListJournalEntriesFilters,
  ): Promise<JournalEntryEntity[]>;
  abstract findLedgerByAccount(
    accountId: string,
    companyId: string,
  ): Promise<AccountLedgerMovement[]>;
  abstract existsReversalOf(entryId: string, ctx?: TransactionContext): Promise<boolean>;
}
