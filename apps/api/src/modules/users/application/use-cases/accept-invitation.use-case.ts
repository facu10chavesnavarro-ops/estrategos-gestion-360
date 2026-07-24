import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InvitationRepository } from '../../domain/repositories/invitation.repository';
import { InvitationTokenPort } from '../../domain/repositories/invitation-token.port';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { CompanyUserRepository } from '../../../companies/domain/repositories/company-user.repository';
import { UserRepository } from '../../../auth/domain/repositories/user.repository';
import { PasswordHasherPort } from '../../../auth/domain/repositories/password-hasher.port';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
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
    private readonly unitOfWork: UnitOfWork,
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

    // Se calcula fuera de la transacción porque es trabajo de CPU costoso
    // (hashing), no una operación de base de datos.
    let passwordHash: string | undefined;
    if (!(await this.userRepository.findByEmail(invitation.email))) {
      if (!input.fullName?.trim()) {
        throw new BadRequestException(
          'El nombre completo es obligatorio para crear la cuenta.',
        );
      }
      passwordHash = await this.passwordHasher.hash(input.password);
    }

    const userId = await this.unitOfWork.run(async (ctx) => {
      let user = await this.userRepository.findByEmail(invitation.email, ctx);
      if (!user) {
        // Si el usuario ya existía, se ignora la contraseña provista acá
        // (RN-USR-07): aceptar una invitación no es un mecanismo para pisar
        // una contraseña existente.
        user = await this.userRepository.create(
          {
            email: invitation.email,
            passwordHash: passwordHash as string,
            fullName: input.fullName as string,
          },
          ctx,
        );
      }

      await this.companyUserRepository.addMembership(
        user.id,
        invitation.companyId,
        role.name,
        ctx,
      );

      await this.invitationRepository.markAccepted(invitation.id, ctx);

      await this.auditLogRepository.record(
        {
          companyId: invitation.companyId,
          userId: user.id,
          action: 'invitation.accept',
          entityType: 'Invitation',
          entityId: invitation.id,
        },
        ctx,
      );

      return user.id;
    });

    return { userId, companyId: invitation.companyId };
  }
}
