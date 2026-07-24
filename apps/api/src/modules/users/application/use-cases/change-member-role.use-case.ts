import { Injectable, NotFoundException } from '@nestjs/common';
import { CompanyUserRepository } from '../../../companies/domain/repositories/company-user.repository';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { ChangeMemberRoleUseCaseInput } from '../dto/member.dto';
import {
  MemberNotFoundError,
  CannotModifySelfError,
} from '../../domain/errors/user-management.errors';

/** RN-USR-01/10/12. */
@Injectable()
export class ChangeMemberRoleUseCase {
  constructor(
    private readonly companyUserRepository: CompanyUserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: ChangeMemberRoleUseCaseInput): Promise<void> {
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

    const newRole = await this.roleRepository.findById(input.roleId);
    if (!newRole) {
      throw new NotFoundException('El rol indicado no existe.');
    }

    await this.unitOfWork.run(async (ctx) => {
      await this.companyUserRepository.updateRole(
        input.targetUserId,
        input.companyId,
        input.roleId,
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'member.role_change',
          entityType: 'CompanyUser',
          entityId: input.targetUserId,
          metadata: { previousRoleId: membership.roleId, newRoleId: input.roleId },
        },
        ctx,
      );
    });
  }
}
