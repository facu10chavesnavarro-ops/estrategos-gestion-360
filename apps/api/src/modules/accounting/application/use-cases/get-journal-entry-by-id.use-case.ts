import { Injectable } from '@nestjs/common';
import { JournalEntryRepository } from '../../domain/repositories/journal-entry.repository';
import { JournalEntryEntity } from '../../domain/entities/journal-entry.entity';
import { JournalEntryNotFoundError } from '../../domain/errors/accounting.errors';

@Injectable()
export class GetJournalEntryByIdUseCase {
  constructor(private readonly journalEntryRepository: JournalEntryRepository) {}

  async execute(journalEntryId: string, companyId: string): Promise<JournalEntryEntity> {
    const entry = await this.journalEntryRepository.findById(journalEntryId, companyId);
    if (!entry) {
      throw new JournalEntryNotFoundError();
    }
    return entry;
  }
}
