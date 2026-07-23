import { Injectable } from '@nestjs/common';
import { CsvImportEngine } from '../../../../common/application/csv-import.engine';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { summarize, ImportSummary } from '../../../../common/domain/import/import.types';
import { SupplierImportRowProcessor } from '../supplier-import-row-processor';
import { ImportSuppliersUseCaseInput } from '../dto/supplier.dto';

/** RN-TER-10/11/12. */
@Injectable()
export class ImportSuppliersUseCase {
  constructor(
    private readonly csvImportEngine: CsvImportEngine,
    private readonly processor: SupplierImportRowProcessor,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: ImportSuppliersUseCaseInput): Promise<ImportSummary> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const results = await this.csvImportEngine.run(
      input.csvContent,
      input.companyId,
      input.mode,
      this.processor,
    );

    for (const result of results) {
      // Mismos nombres de acción que las altas/ediciones manuales, ver
      // ImportCustomersUseCase para el razonamiento.
      if (result.outcome === 'created' || result.outcome === 'updated') {
        const action = result.outcome === 'created' ? 'supplier.create' : 'supplier.update';
        await this.auditLogRepository.record({
          companyId: input.companyId,
          userId: input.requestingUserId,
          action,
          entityType: 'Supplier',
          entityId: result.entityId,
          metadata: { source: 'csv-import', row: result.row, changedFields: result.changedFields },
        });
      }
    }

    const summary = summarize(results);

    await this.auditLogRepository.record({
      companyId: input.companyId,
      userId: input.requestingUserId,
      action: 'supplier.import',
      entityType: 'Supplier',
      metadata: { ...summary },
    });

    return summary;
  }
}
