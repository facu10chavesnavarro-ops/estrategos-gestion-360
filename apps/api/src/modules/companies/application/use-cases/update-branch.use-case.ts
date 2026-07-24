import { Injectable } from '@nestjs/common';
import { BranchRepository } from '../../domain/repositories/branch.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { BranchEntity } from '../../domain/entities/branch.entity';
import { UpdateBranchUseCaseInput } from '../dto/branch.dto';
import { BranchNotFoundError } from '../../domain/errors/company.errors';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';

/** RN-EMP-05, RN-EMP-07, RN-EMP-09. */
@Injectable()
export class UpdateBranchUseCase {
  constructor(
    private readonly branchRepository: BranchRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: UpdateBranchUseCaseInput): Promise<BranchEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.branchRepository.findById(input.branchId);
    if (!existing || existing.companyId !== input.companyId) {
      throw new BranchNotFoundError();
    }

    const {
      requestingUserId,
      requestingRoleName: _role,
      companyId: _companyId,
      branchId,
      ...patch
    } = input;

    return this.unitOfWork.run(async (ctx) => {
      const branch = await this.branchRepository.update(branchId, patch, ctx);

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: requestingUserId,
          action: 'branch.update',
          entityType: 'Branch',
          entityId: branch.id,
          metadata: { fields: Object.keys(patch) },
        },
        ctx,
      );

      return branch;
    });
  }
}
