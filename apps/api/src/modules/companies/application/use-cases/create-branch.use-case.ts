import { Injectable } from '@nestjs/common';
import { BranchRepository } from '../../domain/repositories/branch.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
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
  ) {}

  async execute(input: CreateBranchUseCaseInput): Promise<BranchEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const branch = await this.branchRepository.create({
      companyId: input.companyId,
      name: input.name,
      address: input.address,
      phone: input.phone,
    });

    await this.auditLogRepository.record({
      companyId: input.companyId,
      userId: input.requestingUserId,
      action: 'branch.create',
      entityType: 'Branch',
      entityId: branch.id,
      metadata: { name: branch.name },
    });

    return branch;
  }
}
