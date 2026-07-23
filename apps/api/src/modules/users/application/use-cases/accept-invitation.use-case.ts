import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InvitationRepository } from '../../domain/repositories/invitation.repository';
import { InvitationTokenPort } from '../../domain/repositories/invitation-token.port';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { CompanyUserRepository } from '../../../companies/domain/repositories/company-user.repository';
import { UserRepository } from '../../../auth/domain/repositories/user.repository';
import { PasswordHasherPort } from '../../../auth/domain/repositories/password-hasher.port';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import {
  AcceptInvitationUseCaseInput,
  AcceptInvitationUseCaseOutput,
} from '../dto/invitation.dto';
import {
  InvitationNotFoundError,
  InvitationNotAcceptableError,
} from '../../domain/errors/user-management.errors';

/** RN-USR-04/07. */
@Injectable()
export class AcceptInvitationUseCase {
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly tokenPort: InvitationTokenPort,
    private readonly roleRepository: RoleRepository,
    private readonly companyUserRepository: CompanyUserRepository,
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(
    input: AcceptInvitationUseCaseInput,
  ): Promise<AcceptInvitationUseCaseOutput> {
    const tokenHash = this.tokenPort.hash(input.token);
    const invitation = await this.invitationRepository.findByTokenHash(tokenHash);
    if (!invitation) {
      throw new InvitationNotFoundError();
    }
    if (!invitation.isPending()) {
      throw new InvitationNotAcceptableError();
    }

    const role = await this.roleRepository.findById(invitation.roleId);
    if (!role) {
      throw new NotFoundException('El rol de la invitación ya no existe.');
    }

    let user = await this.userRepository.findByEmail(invitation.email);
    if (!user) {
      if (!input.fullName?.trim()) {
        throw new BadRequestException(
          'El nombre completo es obligatorio para crear la cuenta.',
        );
      }
      const passwordHash = await this.passwordHasher.hash(input.password);
      user = await this.userRepository.create({
        email: invitation.email,
        passwordHash,
        fullName: input.fullName,
      });
    }
    // Si el usuario ya existía, se ignora la contraseña provista acá (RN-USR-07):
    // aceptar una invitación no es un mecanismo para pisar una contraseña existente.

    await this.companyUserRepository.addMembership(
      user.id,
      invitation.companyId,
      role.name,
    );

    await this.invitationRepository.markAccepted(invitation.id);

    await this.auditLogRepository.record({
      companyId: invitation.companyId,
      userId: user.id,
      action: 'invitation.accept',
      entityType: 'Invitation',
      entityId: invitation.id,
    });

    return { userId: user.id, companyId: invitation.companyId };
  }
}
