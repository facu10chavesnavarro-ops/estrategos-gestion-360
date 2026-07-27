import { JournalEntryLineEntity } from './journal-entry-line.entity';

export type JournalEntryOrigin = 'AUTOMATIC' | 'MANUAL';
export type JournalEntrySourceType = 'VOUCHER' | 'PAYMENT';

export class JournalEntryEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly date: Date,
    public readonly description: string,
    public readonly currency: string,
    public readonly exchangeRate: string,
    public readonly origin: JournalEntryOrigin,
    public readonly sourceType: JournalEntrySourceType | null,
    public readonly sourceId: string | null,
    public readonly reversalOfEntryId: string | null,
    public readonly createdByUserId: string,
    public readonly createdAt: Date,
    public readonly lines: JournalEntryLineEntity[],
  ) {}
}
