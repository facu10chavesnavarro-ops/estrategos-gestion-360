import { Injectable } from '@nestjs/common';
import { JournalEntryRepository } from '../../domain/repositories/journal-entry.repository';
import { ApplyJournalEntryService } from '../services/apply-journal-entry.service';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { JournalEntryEntity } from '../../domain/entities/journal-entry.entity';
import { ReverseJournalEntryUseCaseInput } from '../dto/journal-entry.dto';
import {
  JournalEntryNotFoundError,
  JournalEntryAlreadyReversedError,
} from '../../domain/errors/accounting.errors';

/**
 * §2.5: un asiento nunca se edita ni se borra — la corrección es un
 * asiento de reversión que invierte débitos y créditos del original.
 */
@Injectable()
export class ReverseJournalEntryUseCase {
  constructor(
    private readonly journalEntryRepository: JournalEntryRepository,
    private readonly applyJournalEntryService: ApplyJournalEntryService,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: ReverseJournalEntryUseCaseInput): Promise<JournalEntryEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const original = await this.journalEntryRepository.findById(
      input.journalEntryId,
      input.companyId,
    );
    if (!original) {
      throw new JournalEntryNotFoundError();
    }
    if (await this.journalEntryRepository.existsReversalOf(original.id)) {
      throw new JournalEntryAlreadyReversedError();
    }

    return this.unitOfWork.run(async (ctx) => {
      const reversal = await this.applyJournalEntryService.apply(
        {
          companyId: input.companyId,
          date: input.date ? new Date(input.date) : new Date(),
          description: `Reversión de: ${original.description}`,
          currency: original.currency,
          exchangeRate: original.exchangeRate,
          origin: 'MANUAL',
          reversalOfEntryId: original.id,
          createdByUserId: input.requestingUserId,
          lines: original.lines.map((line) => ({
            accountId: line.accountId,
            debit: line.credit,
            credit: line.debit,
            description: line.description ?? undefined,
          })),
        },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'journal_entry.reverse',
          entityType: 'JournalEntry',
          entityId: reversal.id,
          metadata: { reversalOfEntryId: original.id },
        },
        ctx,
      );

      return reversal;
    });
  }
}
