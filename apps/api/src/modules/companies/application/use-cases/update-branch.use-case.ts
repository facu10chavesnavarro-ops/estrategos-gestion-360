import { Injectable } from '@nestjs/common';
import { BranchRepository } from '../../domain/repositories/branch.repository';
import { AuditLogRepository } from '../../domain/repositories/audit-log.repository';
import { BranchEntity } from '../../domain/entities/branch.entity';
import { UpdateBranchUseCaseInput } from '../dto/branch.dto';
import { BranchNotFoundError } from '../../domain/errors/company.errors';
import {
  ROLES_THAT_CAN_MANAGE_COMPANY,
  assertRoleIn,
} from '../../domain/rules/company-roles';

/** RN-EMP-05, RN-EMP-07, RN-EMP-09. */
@Injectable()
export class UpdateBranchUseCase {
  constructor(
    private readonly branchRepository: BranchRepository,
    private readonly auditLogRepository: AuditLogRepository,
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

    const branch = await this.branchRepository.update(branchId, patch);

    await this.auditLogRepository.record({
      companyId: input.companyId,
      userId: requestingUserId,
      action: 'branch.update',
      entityType: 'Branch',
      entityId: branch.id,
      metadata: { fields: Object.keys(patch) },
    });

    return branch;
  }
}
