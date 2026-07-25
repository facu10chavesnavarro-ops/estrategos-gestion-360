import { Injectable } from '@nestjs/common';
import { TaxRepository } from '../../domain/repositories/tax.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { TaxEntity } from '../../domain/entities/tax.entity';
import { UpdateTaxUseCaseInput } from '../dto/tax.dto';
import { TaxNotFoundError } from '../../domain/errors/tax.errors';

/**
 * Solo el nombre es editable — `rate`/`validFrom` son inmutables una vez
 * creado el Tax (RN-CAT-09/10 vía §9 del documento de arquitectura: cambiar
 * una tasa es cerrar este Tax y crear uno nuevo, para no reescribir la
 * historia de comprobantes que en Sprint 3.3 la usarán como snapshot).
 */
@Injectable()
export class UpdateTaxUseCase {
  constructor(
    private readonly taxRepository: TaxRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: UpdateTaxUseCaseInput): Promise<TaxEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.taxRepository.findById(input.taxId, input.companyId);
    if (!existing) {
      throw new TaxNotFoundError();
    }

    return this.unitOfWork.run(async (ctx) => {
      const tax = await this.taxRepository.updateName(input.taxId, input.name, ctx);

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'tax.update',
          entityType: 'Tax',
          entityId: tax.id,
          metadata: { fields: ['name'] },
        },
        ctx,
      );

      return tax;
    });
  }
}
