import { Injectable } from '@nestjs/common';
import { BranchRepository } from '../../domain/repositories/branch.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { BranchEntity } from '../../domain/entities/branch.entity';
import { CreateBranchUseCaseInput } from '../dto/branch.dto';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';

/** RN-EMP-05, RN-EMP-07, RN-EMP-09. */
@Injectable()
export class CreateBranchUseCase {
  constructor(
    private readonly branchRepository: BranchRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: CreateBranchUseCaseInput): Promise<BranchEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    return this.unitOfWork.run(async (ctx) => {
      const branch = await this.branchRepository.create(
        {
          companyId: input.companyId,
          name: input.name,
          address: input.address,
          phone: input.phone,
        },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'branch.create',
          entityType: 'Branch',
          entityId: branch.id,
          metadata: { name: branch.name },
        },
        ctx,
      );

      return branch;
    });
  }
}
