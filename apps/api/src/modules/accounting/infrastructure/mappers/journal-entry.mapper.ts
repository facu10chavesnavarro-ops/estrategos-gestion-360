import { JournalEntry as PrismaJournalEntry, JournalEntryLine as PrismaJournalEntryLine } from '@prisma/client';
import {
  JournalEntryEntity,
  JournalEntryOrigin,
  JournalEntrySourceType,
} from '../../domain/entities/journal-entry.entity';
import { JournalEntryLineEntity } from '../../domain/entities/journal-entry-line.entity';

export type PrismaJournalEntryWithLines = PrismaJournalEntry & { lines: PrismaJournalEntryLine[] };

export class JournalEntryMapper {
  static toDomain(raw: PrismaJournalEntryWithLines): JournalEntryEntity {
    return new JournalEntryEntity(
      raw.id,
      raw.companyId,
      raw.date,
      raw.description,
      raw.currency,
      raw.exchangeRate.toString(),
      raw.origin as JournalEntryOrigin,
      raw.sourceType as JournalEntrySourceType | null,
      raw.sourceId,
      raw.reversalOfEntryId,
      raw.createdByUserId,
      raw.createdAt,
      raw.lines.map(
        (line) =>
          new JournalEntryLineEntity(
            line.id,
            line.journalEntryId,
            line.accountId,
            line.debit.toString(),
            line.credit.toString(),
            line.description,
          ),
      ),
    );
  }
}
