export interface CreateManualJournalEntryLineInput {
  accountId: string;
  debit: string;
  credit: string;
  description?: string;
}

export interface CreateManualJournalEntryUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  date?: string;
  description: string;
  currency?: string;
  lines: CreateManualJournalEntryLineInput[];
}

export interface ListJournalEntriesUseCaseInput {
  companyId: string;
  from?: string;
  to?: string;
}

export interface ReverseJournalEntryUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  journalEntryId: string;
  date?: string;
}

export interface GetAccountLedgerUseCaseInput {
  companyId: string;
  accountId: string;
}
