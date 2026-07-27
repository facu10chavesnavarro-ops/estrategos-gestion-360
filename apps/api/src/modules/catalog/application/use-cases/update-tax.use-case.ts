import { Injectable } from '@nestjs/common';
import { TaxRepository } from '../../domain/repositories/tax.repository';
import { ChartOfAccountRepository } from '../../../accounting/domain/repositories/chart-of-account.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { TaxEntity } from '../../domain/entities/tax.entity';
import { UpdateTaxUseCaseInput } from '../dto/tax.dto';
import { TaxNotFoundError } from '../../domain/errors/tax.errors';
import { InvalidAccountMappingError } from '../../../accounting/domain/errors/accounting.errors';

/**
 * `rate`/`validFrom` son inmutables una vez creado el Tax (RN-CAT-09/10 vía
 * §9 del documento de arquitectura: cambiar una tasa es cerrar este Tax y
 * crear uno nuevo). `name` y el mapeo contable (salesAccountId/
 * purchasesAccountId, Sprint 4 §2.4) sí son editables.
 */
@Injectable()
export class UpdateTaxUseCase {
  constructor(
    private readonly taxRepository: TaxRepository,
    private readonly chartOfAccountRepository: ChartOfAccountRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: UpdateTaxUseCaseInput): Promise<TaxEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.taxRepository.findById(input.taxId, input.companyId);
    if (!existing) {
      throw new TaxNotFoundError();
    }

    for (const accountId of [input.salesAccountId, input.purchasesAccountId]) {
      if (accountId) {
        const account = await this.chartOfAccountRepository.findById(accountId, input.companyId);
        if (!account || !account.allowsMovements || !account.isActive) {
          throw new InvalidAccountMappingError();
        }
      }
    }

    return this.unitOfWork.run(async (ctx) => {
      let tax = await this.taxRepository.updateName(input.taxId, input.name, ctx);
      if (input.salesAccountId !== undefined || input.purchasesAccountId !== undefined) {
        tax = await this.taxRepository.updateAccounts(
          input.taxId,
          { salesAccountId: input.salesAccountId, purchasesAccountId: input.purchasesAccountId },
          ctx,
        );
      }

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'tax.update',
          entityType: 'Tax',
          entityId: tax.id,
          metadata: { fields: ['name', 'salesAccountId', 'purchasesAccountId'] },
        },
        ctx,
      );

      return tax;
    });
  }
}
