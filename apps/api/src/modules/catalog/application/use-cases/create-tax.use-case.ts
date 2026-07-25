import { Injectable } from '@nestjs/common';
import { TaxRepository } from '../../domain/repositories/tax.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { TaxEntity } from '../../domain/entities/tax.entity';
import { CreateTaxUseCaseInput } from '../dto/tax.dto';
import { InvalidTaxRateError, InvalidTaxValidityError } from '../../domain/errors/tax.errors';

/** RN-CAT-01/09/10/14/15. */
@Injectable()
export class CreateTaxUseCase {
  constructor(
    private readonly taxRepository: TaxRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: CreateTaxUseCaseInput): Promise<TaxEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    if (Number(input.rate) < 0) {
      throw new InvalidTaxRateError();
    }

    const validFrom = input.validFrom ? new Date(input.validFrom) : new Date();
    const validTo = input.validTo ? new Date(input.validTo) : undefined;
    if (validTo && validTo <= validFrom) {
      throw new InvalidTaxValidityError();
    }

    return this.unitOfWork.run(async (ctx) => {
      const tax = await this.taxRepository.create(
        {
          companyId: input.companyId,
          name: input.name,
          type: input.type,
          rate: input.rate,
          validFrom,
          validTo,
        },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'tax.create',
          entityType: 'Tax',
          entityId: tax.id,
          metadata: { name: tax.name, type: tax.type, rate: tax.rate },
        },
        ctx,
      );

      return tax;
    });
  }
}
