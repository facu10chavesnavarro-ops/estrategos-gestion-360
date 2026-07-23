import { Injectable } from '@nestjs/common';
import { InvitationRepository } from '../../domain/repositories/invitation.repository';
import { InvitationTokenPort } from '../../domain/repositories/invitation-token.port';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { CompanyRepository } from '../../../companies/domain/repositories/company.repository';
import { InvitationPreview } from '../dto/invitation.dto';
import { InvitationNotFoundError } from '../../domain/errors/user-management.errors';

/**
 * Solo valida que el token exista. Vencida/aceptada/revocada se informa en
 * `status` (no se rechaza acá) para que el frontend pueda mostrar un mensaje
 * claro antes de que el usuario intente aceptar — RN-USR-04 se hace cumplir
 * de verdad recién en AcceptInvitationUseCase.
 */
@Injectable()
export class GetInvitationByTokenUseCase {
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly tokenPort: InvitationTokenPort,
    private readonly roleRepository: RoleRepository,
    private readonly companyRepository: CompanyRepository,
  ) {}

  async execute(token: string): Promise<InvitationPreview> {
    const tokenHash = this.tokenPort.hash(token);
    const invitation = await this.invitationRepository.findByTokenHash(tokenHash);
    if (!invitation) {
      throw new InvitationNotFoundError();
    }

    const [role, company] = await Promise.all([
      this.roleRepository.findById(invitation.roleId),
      this.companyRepository.findById(invitation.companyId),
    ]);

    return {
      companyName: company?.legalName ?? '',
      roleName: role?.name ?? '',
      email: invitation.email,
      status: invitation.status(),
    };
  }
}
