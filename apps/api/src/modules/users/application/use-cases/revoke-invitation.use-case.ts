import { Injectable } from '@nestjs/common';
import { InvitationRepository } from '../../domain/repositories/invitation.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { RevokeInvitationUseCaseInput } from '../dto/invitation.dto';
import {
  InvitationNotFoundError,
  InvitationNotPendingError,
} from '../../domain/errors/user-management.errors';

/** RN-USR-01/13. */
@Injectable()
export class RevokeInvitationUseCase {
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: RevokeInvitationUseCaseInput): Promise<void> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const invitation = await this.invitationRepository.findById(
      input.invitationId,
    );
    if (!invitation || invitation.companyId !== input.companyId) {
      throw new InvitationNotFoundError();
    }
    if (!invitation.isPending()) {
      throw new InvitationNotPendingError();
    }

    await this.unitOfWork.run(async (ctx) => {
      await this.invitationRepository.markRevoked(
        invitation.id,
        input.requestingUserId,
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'invitation.revoke',
          entityType: 'Invitation',
          entityId: invitation.id,
        },
        ctx,
      );
    });
  }
}
