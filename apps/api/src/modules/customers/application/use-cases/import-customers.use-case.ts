import { Injectable } from '@nestjs/common';
import { CsvImportEngine } from '../../../../common/application/csv-import.engine';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { summarize, ImportSummary } from '../../../../common/domain/import/import.types';
import { CustomerImportRowProcessor } from '../customer-import-row-processor';
import { ImportCustomersUseCaseInput } from '../dto/customer.dto';

/** RN-TER-10/11/12. Único caso de uso específico de Clientes en la importación — el resto vive en CsvImportEngine. */
@Injectable()
export class ImportCustomersUseCase {
  constructor(
    private readonly csvImportEngine: CsvImportEngine,
    private readonly processor: CustomerImportRowProcessor,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: ImportCustomersUseCaseInput): Promise<ImportSummary> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const results = await this.csvImportEngine.run(
      input.csvContent,
      input.companyId,
      input.mode,
      this.processor,
    );

    for (const result of results) {
      // Mismos nombres de acción que las altas/ediciones manuales (customer.create/
      // customer.update), no "created"/"updated" — para que filtrar auditoría por
      // acción no distinga si el cambio vino de CSV o del formulario.
      if (result.outcome === 'created' || result.outcome === 'updated') {
        const action = result.outcome === 'created' ? 'customer.create' : 'customer.update';
        await this.auditLogRepository.record({
          companyId: input.companyId,
          userId: input.requestingUserId,
          action,
          entityType: 'Customer',
          entityId: result.entityId,
          metadata: { source: 'csv-import', row: result.row, changedFields: result.changedFields },
        });
      }
    }

    const summary = summarize(results);

    await this.auditLogRepository.record({
      companyId: input.companyId,
      userId: input.requestingUserId,
      action: 'customer.import',
      entityType: 'Customer',
      metadata: { ...summary },
    });

    return summary;
  }
}
