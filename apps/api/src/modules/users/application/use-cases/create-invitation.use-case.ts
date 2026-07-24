import { Injectable, NotFoundException } from '@nestjs/common';
import { InvitationRepository } from '../../domain/repositories/invitation.repository';
import { InvitationTokenPort } from '../../domain/repositories/invitation-token.port';
import { InvitationNotifierPort } from '../../domain/repositories/invitation-notifier.port';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { CompanyUserRepository } from '../../../companies/domain/repositories/company-user.repository';
import { CompanyRepository } from '../../../companies/domain/repositories/company.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import {
  CreateInvitationUseCaseInput,
  CreateInvitationUseCaseOutput,
} from '../dto/invitation.dto';
import {
  DuplicateActiveMembershipError,
  DuplicatePendingInvitationError,
} from '../../domain/errors/user-management.errors';

const INVITATION_TTL_DAYS = 7;

/** RN-USR-01/02/03/05/06/14. */
@Injectable()
export class CreateInvitationUseCase {
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly companyUserRepository: CompanyUserRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly roleRepository: RoleRepository,
    private readonly tokenPort: InvitationTokenPort,
    private readonly notifier: InvitationNotifierPort,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(
    input: CreateInvitationUseCaseInput,
  ): Promise<CreateInvitationUseCaseOutput> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const role = await this.roleRepository.findById(input.roleId);
    if (!role) {
      throw new NotFoundException('El rol indicado no existe.');
    }

    const hasActiveMembership =
      await this.companyUserRepository.hasActiveMembershipByEmail(
        input.email,
        input.companyId,
      );
    if (hasActiveMembership) {
      throw new DuplicateActiveMembershipError();
    }

    const pending = await this.invitationRepository.findPendingByEmailAndCompany(
      input.email,
      input.companyId,
    );
    if (pending) {
      throw new DuplicatePendingInvitationError();
    }

    const { token, tokenHash } = this.tokenPort.generate();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_TTL_DAYS);

    const invitation = await this.unitOfWork.run(async (ctx) => {
      const created = await this.invitationRepository.create(
        {
          companyId: input.companyId,
          email: input.email,
          roleId: input.roleId,
          tokenHash,
          invitedByUserId: input.requestingUserId,
          expiresAt,
        },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'invitation.create',
          entityType: 'Invitation',
          entityId: created.id,
          metadata: { email: input.email, roleId: input.roleId },
        },
        ctx,
      );

      return created;
    });

    const company = await this.companyRepository.findById(input.companyId);
    await this.notifier.notifyInvitationCreated({
      email: input.email,
      token,
      companyName: company?.legalName ?? '',
      roleName: role.name,
    });

    return {
      id: invitation.id,
      email: invitation.email,
      roleId: invitation.roleId,
      expiresAt: invitation.expiresAt,
      token,
    };
  }
}
