import { Injectable } from '@nestjs/common';
import { JournalEntryRepository } from '../../domain/repositories/journal-entry.repository';
import { JournalEntryEntity } from '../../domain/entities/journal-entry.entity';
import { ListJournalEntriesUseCaseInput } from '../dto/journal-entry.dto';

/** Libro Diario (§5). */
@Injectable()
export class ListJournalEntriesUseCase {
  constructor(private readonly journalEntryRepository: JournalEntryRepository) {}

  async execute(input: ListJournalEntriesUseCaseInput): Promise<JournalEntryEntity[]> {
    return this.journalEntryRepository.findAllByCompany(input.companyId, {
      from: input.from ? new Date(input.from) : undefined,
      to: input.to ? new Date(input.to) : undefined,
    });
  }
}
