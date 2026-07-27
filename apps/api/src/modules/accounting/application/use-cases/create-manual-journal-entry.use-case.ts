import { Injectable } from '@nestjs/common';
import { ApplyJournalEntryService } from '../services/apply-journal-entry.service';
import { CompanyRepository } from '../../../companies/domain/repositories/company.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { JournalEntryEntity } from '../../domain/entities/journal-entry.entity';
import { CreateManualJournalEntryUseCaseInput } from '../dto/journal-entry.dto';

/** Asiento manual (§2.7): mismo motor que los automáticos, sin sourceType/sourceId. */
@Injectable()
export class CreateManualJournalEntryUseCase {
  constructor(
    private readonly applyJournalEntryService: ApplyJournalEntryService,
    private readonly companyRepository: CompanyRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: CreateManualJournalEntryUseCaseInput): Promise<JournalEntryEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const company = await this.companyRepository.findById(input.companyId);

    return this.unitOfWork.run(async (ctx) => {
      const entry = await this.applyJournalEntryService.apply(
        {
          companyId: input.companyId,
          date: input.date ? new Date(input.date) : new Date(),
          description: input.description,
          currency: input.currency ?? company?.currency ?? 'ARS',
          exchangeRate: '1',
          origin: 'MANUAL',
          createdByUserId: input.requestingUserId,
          lines: input.lines,
        },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'journal_entry.create',
          entityType: 'JournalEntry',
          entityId: entry.id,
          metadata: { origin: 'MANUAL', lines: entry.lines.length },
        },
        ctx,
      );

      return entry;
    });
  }
}
