import { Injectable } from '@nestjs/common';
import { CompanyUserRepository } from '../../../companies/domain/repositories/company-user.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { ChangeMemberStateUseCaseInput } from '../dto/member.dto';
import {
  MemberNotFoundError,
  MemberAlreadyInTargetStateError,
  CannotModifySelfError,
} from '../../domain/errors/user-management.errors';

/** RN-USR-01/09/12. */
@Injectable()
export class DeactivateMemberUseCase {
  constructor(
    private readonly companyUserRepository: CompanyUserRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: ChangeMemberStateUseCaseInput): Promise<void> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    if (input.targetUserId === input.requestingUserId) {
      throw new CannotModifySelfError();
    }

    const membership = await this.companyUserRepository.findMembership(
      input.targetUserId,
      input.companyId,
    );
    if (!membership) {
      throw new MemberNotFoundError();
    }
    if (!membership.isActive) {
      throw new MemberAlreadyInTargetStateError('inactivo');
    }

    await this.companyUserRepository.setActive(
      input.targetUserId,
      input.companyId,
      false,
    );

    await this.auditLogRepository.record({
      companyId: input.companyId,
      userId: input.requestingUserId,
      action: 'member.deactivate',
      entityType: 'CompanyUser',
      entityId: input.targetUserId,
    });
  }
}
