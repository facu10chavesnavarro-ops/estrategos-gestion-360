import { Injectable } from '@nestjs/common';
import { BranchRepository } from '../../domain/repositories/branch.repository';
import { AuditLogRepository } from '../../domain/repositories/audit-log.repository';
import { BranchEntity } from '../../domain/entities/branch.entity';
import { ChangeBranchStateUseCaseInput } from '../dto/branch.dto';
import {
  BranchNotFoundError,
  AlreadyInTargetStateError,
} from '../../domain/errors/company.errors';
import {
  ROLES_THAT_CAN_MANAGE_COMPANY,
  assertRoleIn,
} from '../../domain/rules/company-roles';

/** RN-EMP-04, RN-EMP-05, RN-EMP-06, RN-EMP-07, RN-EMP-09. */
@Injectable()
export class DeactivateBranchUseCase {
  constructor(
    private readonly branchRepository: BranchRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: ChangeBranchStateUseCaseInput): Promise<BranchEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.branchRepository.findById(input.branchId);
    if (!existing || existing.companyId !== input.companyId) {
      throw new BranchNotFoundError();
    }
    if (!existing.isActive) {
      throw new AlreadyInTargetStateError('La sucursal', 'inactiva');
    }

    const branch = await this.branchRepository.setActive(input.branchId, false);

    await this.auditLogRepository.record({
      companyId: input.companyId,
      userId: input.requestingUserId,
      action: 'branch.deactivate',
      entityType: 'Branch',
      entityId: branch.id,
      metadata: { reason: input.reason },
    });

    return branch;
  }
}
