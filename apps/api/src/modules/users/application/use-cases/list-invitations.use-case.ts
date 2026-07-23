import { Injectable } from '@nestjs/common';
import { InvitationRepository } from '../../domain/repositories/invitation.repository';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { InvitationListItem } from '../dto/invitation.dto';

@Injectable()
export class ListInvitationsUseCase {
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  async execute(companyId: string): Promise<InvitationListItem[]> {
    const [invitations, roles] = await Promise.all([
      this.invitationRepository.findAllByCompany(companyId),
      this.roleRepository.findAll(),
    ]);
    const roleNameById = new Map(roles.map((r) => [r.id, r.name]));

    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      roleId: inv.roleId,
      roleName: roleNameById.get(inv.roleId) ?? '',
      status: inv.status(),
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    }));
  }
}
