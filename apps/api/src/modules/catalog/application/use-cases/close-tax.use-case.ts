import { Injectable } from '@nestjs/common';
import { TaxRepository } from '../../domain/repositories/tax.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { TaxEntity } from '../../domain/entities/tax.entity';
import { CloseTaxUseCaseInput } from '../dto/tax.dto';
import { TaxNotFoundError, TaxAlreadyClosedError } from '../../domain/errors/tax.errors';

/** RN-CAT-04/10/14/15: cerrar la vigencia (validTo = ahora) en vez de eliminar. */
@Injectable()
export class CloseTaxUseCase {
  constructor(
    private readonly taxRepository: TaxRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: CloseTaxUseCaseInput): Promise<TaxEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.taxRepository.findById(input.taxId, input.companyId);
    if (!existing) {
      throw new TaxNotFoundError();
    }
    if (existing.validTo !== null && existing.validTo <= new Date()) {
      throw new TaxAlreadyClosedError();
    }

    return this.unitOfWork.run(async (ctx) => {
      const tax = await this.taxRepository.close(input.taxId, new Date(), ctx);

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'tax.close',
          entityType: 'Tax',
          entityId: tax.id,
        },
        ctx,
      );

      return tax;
    });
  }
}
