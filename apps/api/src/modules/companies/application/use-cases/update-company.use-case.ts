import { Injectable } from '@nestjs/common';
import { CompanyRepository } from '../../domain/repositories/company.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { CompanyEntity } from '../../domain/entities/company.entity';
import { UpdateCompanyUseCaseInput } from '../dto/company.dto';
import { InvalidTaxIdError } from '../../domain/errors/company.errors';
import { isValidTaxId } from '../../../../common/domain/rules/tax-id.validator';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';

/** RN-EMP-05, RN-EMP-07, RN-EMP-08. */
@Injectable()
export class UpdateCompanyUseCase {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: UpdateCompanyUseCaseInput): Promise<CompanyEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    if (input.taxId && !isValidTaxId(input.taxId)) {
      throw new InvalidTaxIdError();
    }

    const { requestingUserId, requestingRoleName: _role, companyId, ...patch } =
      input;

    return this.unitOfWork.run(async (ctx) => {
      const company = await this.companyRepository.update(companyId, patch, ctx);

      await this.auditLogRepository.record(
        {
          companyId: company.id,
          userId: requestingUserId,
          action: 'company.update',
          entityType: 'Company',
          entityId: company.id,
          metadata: { fields: Object.keys(patch) },
        },
        ctx,
      );

      return company;
    });
  }
}
