import { Module } from '@nestjs/common';
import { RolesController } from './presentation/controllers/roles.controller';
import { CompanyMembersController } from './presentation/controllers/company-members.controller';
import { CompanyInvitationsController } from './presentation/controllers/company-invitations.controller';
import { PublicInvitationsController } from './presentation/controllers/public-invitations.controller';

import { ListRolesUseCase } from './application/use-cases/list-roles.use-case';
import { ListCompanyMembersUseCase } from './application/use-cases/list-company-members.use-case';
import { CreateInvitationUseCase } from './application/use-cases/create-invitation.use-case';
import { ListInvitationsUseCase } from './application/use-cases/list-invitations.use-case';
import { RevokeInvitationUseCase } from './application/use-cases/revoke-invitation.use-case';
import { GetInvitationByTokenUseCase } from './application/use-cases/get-invitation-by-token.use-case';
import { AcceptInvitationUseCase } from './application/use-cases/accept-invitation.use-case';
import { ChangeMemberRoleUseCase } from './application/use-cases/change-member-role.use-case';
import { DeactivateMemberUseCase } from './application/use-cases/deactivate-member.use-case';
import { ActivateMemberUseCase } from './application/use-cases/activate-member.use-case';

import { InvitationRepository } from './domain/repositories/invitation.repository';
import { PrismaInvitationRepository } from './infrastructure/persistence/prisma-invitation.repository';
import { RoleRepository } from './domain/repositories/role.repository';
import { PrismaRoleRepository } from './infrastructure/persistence/prisma-role.repository';
import { InvitationTokenPort } from './domain/repositories/invitation-token.port';
import { CryptoInvitationTokenProvider } from './infrastructure/crypto-invitation-token.provider';
import { InvitationNotifierPort } from './domain/repositories/invitation-notifier.port';
import { NoopInvitationNotifier } from './infrastructure/noop-invitation-notifier';

import { CompanyUserRepository } from '../companies/domain/repositories/company-user.repository';
import { PrismaCompanyUserRepository } from '../companies/infrastructure/persistence/prisma-company-user.repository';
import { CompanyRepository } from '../companies/domain/repositories/company.repository';
import { PrismaCompanyRepository } from '../companies/infrastructure/persistence/prisma-company.repository';

import { UserRepository } from '../auth/domain/repositories/user.repository';
import { PrismaUserRepository } from '../auth/infrastructure/persistence/prisma-user.repository';
import { PasswordHasherPort } from '../auth/domain/repositories/password-hasher.port';
import { Argon2PasswordHasher } from '../auth/infrastructure/argon2-password-hasher';

import { AuditLogRepository } from '../../common/domain/repositories/audit-log.repository';
import { PrismaAuditLogRepository } from '../../common/infrastructure/persistence/prisma-audit-log.repository';
import { PrismaService } from '../../common/persistence/prisma.service';

@Module({
  controllers: [
    RolesController,
    CompanyMembersController,
    CompanyInvitationsController,
    PublicInvitationsController,
  ],
  providers: [
    PrismaService,
    ListRolesUseCase,
    ListCompanyMembersUseCase,
    CreateInvitationUseCase,
    ListInvitationsUseCase,
    RevokeInvitationUseCase,
    GetInvitationByTokenUseCase,
    AcceptInvitationUseCase,
    ChangeMemberRoleUseCase,
    DeactivateMemberUseCase,
    ActivateMemberUseCase,
    { provide: InvitationRepository, useClass: PrismaInvitationRepository },
    { provide: RoleRepository, useClass: PrismaRoleRepository },
    { provide: InvitationTokenPort, useClass: CryptoInvitationTokenProvider },
    { provide: InvitationNotifierPort, useClass: NoopInvitationNotifier },
    { provide: CompanyUserRepository, useClass: PrismaCompanyUserRepository },
    { provide: CompanyRepository, useClass: PrismaCompanyRepository },
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: PasswordHasherPort, useClass: Argon2PasswordHasher },
    { provide: AuditLogRepository, useClass: PrismaAuditLogRepository },
  ],
})
export class UsersModule {}
