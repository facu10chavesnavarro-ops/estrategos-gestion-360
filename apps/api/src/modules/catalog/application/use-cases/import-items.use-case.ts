import { Injectable } from '@nestjs/common';
import { CsvImportEngine } from '../../../../common/application/csv-import.engine';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { summarize, ImportSummary } from '../../../../common/domain/import/import.types';
import { ItemImportRowProcessor } from '../item-import-row-processor';
import { ImportItemsUseCaseInput } from '../dto/item.dto';

/** Único caso de uso específico de Ítems en la importación — el resto vive en CsvImportEngine (mismo patrón que ImportCustomersUseCase de F2). */
@Injectable()
export class ImportItemsUseCase {
  constructor(
    private readonly csvImportEngine: CsvImportEngine,
    private readonly processor: ItemImportRowProcessor,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: ImportItemsUseCaseInput): Promise<ImportSummary> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const results = await this.csvImportEngine.run(
      input.csvContent,
      input.companyId,
      input.mode,
      this.processor,
    );

    for (const result of results) {
      if (result.outcome === 'created' || result.outcome === 'updated') {
        const action = result.outcome === 'created' ? 'item.create' : 'item.update';
        await this.auditLogRepository.record({
          companyId: input.companyId,
          userId: input.requestingUserId,
          action,
          entityType: 'Item',
          entityId: result.entityId,
          metadata: { source: 'csv-import', row: result.row, changedFields: result.changedFields },
        });
      }
    }

    const summary = summarize(results);

    await this.auditLogRepository.record({
      companyId: input.companyId,
      userId: input.requestingUserId,
      action: 'item.import',
      entityType: 'Item',
      metadata: { ...summary },
    });

    return summary;
  }
}
