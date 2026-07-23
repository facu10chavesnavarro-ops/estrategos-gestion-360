import { Injectable } from '@nestjs/common';
import { CompanyUserRepository } from '../../../companies/domain/repositories/company-user.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { ChangeMemberStateUseCaseInput } from '../dto/member.dto';
import {
  MemberNotFoundError,
  MemberAlreadyInTargetStateError,
} from '../../domain/errors/user-management.errors';

/** RN-USR-01/09. */
@Injectable()
export class ActivateMemberUseCase {
  constructor(
    private readonly companyUserRepository: CompanyUserRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: ChangeMemberStateUseCaseInput): Promise<void> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const membership = await this.companyUserRepository.findMembership(
      input.targetUserId,
      input.companyId,
    );
    if (!membership) {
      throw new MemberNotFoundError();
    }
    if (membership.isActive) {
      throw new MemberAlreadyInTargetStateError('activo');
    }

    await this.companyUserRepository.setActive(
      input.targetUserId,
      input.companyId,
      true,
    );

    await this.auditLogRepository.record({
      companyId: input.companyId,
      userId: input.requestingUserId,
      action: 'member.activate',
      entityType: 'CompanyUser',
      entityId: input.targetUserId,
    });
  }
}
