import { Injectable } from '@nestjs/common';
import { CompanyRepository } from '../../domain/repositories/company.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { CompanyEntity } from '../../domain/entities/company.entity';
import { ChangeCompanyStateUseCaseInput } from '../dto/company.dto';
import {
  CompanyNotFoundError,
  AlreadyInTargetStateError,
} from '../../domain/errors/company.errors';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';

/** RN-EMP-05, RN-EMP-06, RN-EMP-07. */
@Injectable()
export class ActivateCompanyUseCase {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: ChangeCompanyStateUseCaseInput): Promise<CompanyEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.companyRepository.findById(input.companyId);
    if (!existing) {
      throw new CompanyNotFoundError();
    }
    if (existing.isActive) {
      throw new AlreadyInTargetStateError('La empresa', 'activa');
    }

    return this.unitOfWork.run(async (ctx) => {
      const company = await this.companyRepository.setActive(
        input.companyId,
        true,
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: company.id,
          userId: input.requestingUserId,
          action: 'company.activate',
          entityType: 'Company',
          entityId: company.id,
        },
        ctx,
      );

      return company;
    });
  }
}
