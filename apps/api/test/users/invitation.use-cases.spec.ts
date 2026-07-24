import { CreateInvitationUseCase } from '../../src/modules/users/application/use-cases/create-invitation.use-case';
import { RevokeInvitationUseCase } from '../../src/modules/users/application/use-cases/revoke-invitation.use-case';
import { GetInvitationByTokenUseCase } from '../../src/modules/users/application/use-cases/get-invitation-by-token.use-case';
import { AcceptInvitationUseCase } from '../../src/modules/users/application/use-cases/accept-invitation.use-case';
import { ListInvitationsUseCase } from '../../src/modules/users/application/use-cases/list-invitations.use-case';
import { InvitationEntity } from '../../src/modules/users/domain/entities/invitation.entity';
import { RoleEntity } from '../../src/modules/users/domain/entities/role.entity';
import { InvitationRepository } from '../../src/modules/users/domain/repositories/invitation.repository';
import { RoleRepository } from '../../src/modules/users/domain/repositories/role.repository';
import { InvitationTokenPort } from '../../src/modules/users/domain/repositories/invitation-token.port';
import { InvitationNotifierPort } from '../../src/modules/users/domain/repositories/invitation-notifier.port';
import { CompanyUserRepository } from '../../src/modules/companies/domain/repositories/company-user.repository';
import { CompanyRepository } from '../../src/modules/companies/domain/repositories/company.repository';
import { UserRepository } from '../../src/modules/auth/domain/repositories/user.repository';
import { PasswordHasherPort } from '../../src/modules/auth/domain/repositories/password-hasher.port';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { UserEntity } from '../../src/modules/auth/domain/entities/user.entity';
import { CompanyEntity } from '../../src/modules/companies/domain/entities/company.entity';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import {
  DuplicateActiveMembershipError,
  DuplicatePendingInvitationError,
  InvitationNotFoundError,
  InvitationNotAcceptableError,
  InvitationNotPendingError,
} from '../../src/modules/users/domain/errors/user-management.errors';
import {
  createFakeUnitOfWork,
  FAKE_TRANSACTION_CONTEXT,
} from '../support/fake-unit-of-work';

function makeInvitation(overrides: Partial<{
  id: string;
  companyId: string;
  email: string;
  roleId: string;
  invitedByUserId: string;
  revokedByUserId: string | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}> = {}): InvitationEntity {
  return new InvitationEntity(
    overrides.id ?? 'inv-1',
    overrides.companyId ?? 'company-1',
    overrides.email ?? 'nuevo@estrategos.com',
    overrides.roleId ?? 'role-1',
    overrides.invitedByUserId ?? 'user-admin',
    overrides.revokedByUserId ?? null,
    overrides.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    overrides.acceptedAt ?? null,
    overrides.revokedAt ?? null,
    overrides.createdAt ?? new Date(),
  );
}

function makeCompany(): CompanyEntity {
  return new CompanyEntity(
    'company-1',
    'tenant-1',
    'Empresa Piloto SRL',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    'ARS',
    'America/Argentina/Jujuy',
    true,
  );
}

describe('CreateInvitationUseCase', () => {
  let invitationRepository: jest.Mocked<InvitationRepository>;
  let companyUserRepository: jest.Mocked<CompanyUserRepository>;
  let companyRepository: jest.Mocked<CompanyRepository>;
  let roleRepository: jest.Mocked<RoleRepository>;
  let tokenPort: jest.Mocked<InvitationTokenPort>;
  let notifier: jest.Mocked<InvitationNotifierPort>;
  let auditLogRepository: jest.Mocked<AuditLogRepository>;
  let useCase: CreateInvitationUseCase;

  beforeEach(() => {
    invitationRepository = {
      create: jest.fn().mockResolvedValue(makeInvitation()),
      findById: jest.fn(),
      findByTokenHash: jest.fn(),
      findPendingByEmailAndCompany: jest.fn().mockResolvedValue(null),
      findAllByCompany: jest.fn(),
      markAccepted: jest.fn(),
      markRevoked: jest.fn(),
    } as jest.Mocked<InvitationRepository>;

    companyUserRepository = {
      hasRoleInTenant: jest.fn(),
      addMembership: jest.fn(),
      hasActiveMembershipByEmail: jest.fn().mockResolvedValue(false),
      findAllByCompanyWithDetails: jest.fn(),
      findMembership: jest.fn(),
      updateRole: jest.fn(),
      setActive: jest.fn(),
    } as jest.Mocked<CompanyUserRepository>;

    companyRepository = {
      create: jest.fn(),
      findAllForUser: jest.fn(),
      findById: jest.fn().mockResolvedValue(makeCompany()),
      update: jest.fn(),
      setActive: jest.fn(),
    } as unknown as jest.Mocked<CompanyRepository>;

    roleRepository = {
      findAll: jest.fn(),
      findById: jest.fn().mockResolvedValue(new RoleEntity('role-1', 'Empleado', null)),
    } as jest.Mocked<RoleRepository>;

    tokenPort = {
      generate: jest.fn().mockReturnValue({ token: 'plain-token', tokenHash: 'hashed-token' }),
      hash: jest.fn(),
    } as jest.Mocked<InvitationTokenPort>;

    notifier = {
      notifyInvitationCreated: jest.fn(),
    } as jest.Mocked<InvitationNotifierPort>;

    auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;

    useCase = new CreateInvitationUseCase(
      invitationRepository,
      companyUserRepository,
      companyRepository,
      roleRepository,
      tokenPort,
      notifier,
      auditLogRepository,
      createFakeUnitOfWork(),
    );
  });

  it('crea la invitación cuando el rol autoriza', async () => {
    const result = await useCase.execute({
      requestingUserId: 'user-admin',
      requestingRoleName: 'Administrador de empresa',
      companyId: 'company-1',
      email: 'nuevo@estrategos.com',
      roleId: 'role-1',
    });

    expect(result.token).toBe('plain-token');
    expect(invitationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ tokenHash: 'hashed-token' }),
      FAKE_TRANSACTION_CONTEXT,
    );
    expect(notifier.notifyInvitationCreated).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'nuevo@estrategos.com', token: 'plain-token' }),
    );
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'invitation.create' }),
      FAKE_TRANSACTION_CONTEXT,
    );
  });

  it('rechaza si el rol no autoriza', async () => {
    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Empleado',
        companyId: 'company-1',
        email: 'nuevo@estrategos.com',
        roleId: 'role-1',
      }),
    ).rejects.toThrow(RoleNotAuthorizedError);

    expect(invitationRepository.create).not.toHaveBeenCalled();
  });

  it('rechaza si el email ya tiene membresía activa (RN-USR-05)', async () => {
    companyUserRepository.hasActiveMembershipByEmail.mockResolvedValue(true);

    await expect(
      useCase.execute({
        requestingUserId: 'user-admin',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        email: 'ya-existe@estrategos.com',
        roleId: 'role-1',
      }),
    ).rejects.toThrow(DuplicateActiveMembershipError);
  });

  it('rechaza si ya hay una invitación pendiente para ese email/empresa (RN-USR-06)', async () => {
    invitationRepository.findPendingByEmailAndCompany.mockResolvedValue(makeInvitation());

    await expect(
      useCase.execute({
        requestingUserId: 'user-admin',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        email: 'nuevo@estrategos.com',
        roleId: 'role-1',
      }),
    ).rejects.toThrow(DuplicatePendingInvitationError);
  });
});

describe('RevokeInvitationUseCase', () => {
  let invitationRepository: jest.Mocked<InvitationRepository>;
  let auditLogRepository: jest.Mocked<AuditLogRepository>;
  let useCase: RevokeInvitationUseCase;

  beforeEach(() => {
    invitationRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByTokenHash: jest.fn(),
      findPendingByEmailAndCompany: jest.fn(),
      findAllByCompany: jest.fn(),
      markAccepted: jest.fn(),
      markRevoked: jest.fn(),
    } as jest.Mocked<InvitationRepository>;
    auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    useCase = new RevokeInvitationUseCase(
      invitationRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );
  });

  it('revoca una invitación pendiente y registra quién la revocó', async () => {
    invitationRepository.findById.mockResolvedValue(makeInvitation());

    await useCase.execute({
      requestingUserId: 'user-admin',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      invitationId: 'inv-1',
    });

    expect(invitationRepository.markRevoked).toHaveBeenCalledWith(
      'inv-1',
      'user-admin',
      FAKE_TRANSACTION_CONTEXT,
    );
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'invitation.revoke' }),
      FAKE_TRANSACTION_CONTEXT,
    );
  });

  it('rechaza si ya estaba aceptada', async () => {
    invitationRepository.findById.mockResolvedValue(
      makeInvitation({ acceptedAt: new Date() }),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-admin',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        invitationId: 'inv-1',
      }),
    ).rejects.toThrow(InvitationNotPendingError);
  });

  it('rechaza si el rol no autoriza', async () => {
    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Consultor',
        companyId: 'company-1',
        invitationId: 'inv-1',
      }),
    ).rejects.toThrow(RoleNotAuthorizedError);
  });
});

describe('GetInvitationByTokenUseCase / AcceptInvitationUseCase', () => {
  let invitationRepository: jest.Mocked<InvitationRepository>;
  let tokenPort: jest.Mocked<InvitationTokenPort>;
  let roleRepository: jest.Mocked<RoleRepository>;
  let companyRepository: jest.Mocked<CompanyRepository>;
  let companyUserRepository: jest.Mocked<CompanyUserRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let passwordHasher: jest.Mocked<PasswordHasherPort>;
  let auditLogRepository: jest.Mocked<AuditLogRepository>;
  let getByTokenUseCase: GetInvitationByTokenUseCase;
  let acceptUseCase: AcceptInvitationUseCase;

  beforeEach(() => {
    invitationRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByTokenHash: jest.fn(),
      findPendingByEmailAndCompany: jest.fn(),
      findAllByCompany: jest.fn(),
      markAccepted: jest.fn(),
      markRevoked: jest.fn(),
    } as jest.Mocked<InvitationRepository>;

    tokenPort = {
      generate: jest.fn(),
      hash: jest.fn().mockReturnValue('hashed-token'),
    } as jest.Mocked<InvitationTokenPort>;

    roleRepository = {
      findAll: jest.fn(),
      findById: jest.fn().mockResolvedValue(new RoleEntity('role-1', 'Empleado', null)),
    } as jest.Mocked<RoleRepository>;

    companyRepository = {
      create: jest.fn(),
      findAllForUser: jest.fn(),
      findById: jest.fn().mockResolvedValue(makeCompany()),
      update: jest.fn(),
      setActive: jest.fn(),
    } as unknown as jest.Mocked<CompanyRepository>;

    companyUserRepository = {
      hasRoleInTenant: jest.fn(),
      addMembership: jest.fn(),
      hasActiveMembershipByEmail: jest.fn(),
      findAllByCompanyWithDetails: jest.fn(),
      findMembership: jest.fn(),
      updateRole: jest.fn(),
      setActive: jest.fn(),
    } as jest.Mocked<CompanyUserRepository>;

    userRepository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
      updateLastLogin: jest.fn(),
      create: jest.fn().mockResolvedValue(
        new UserEntity('user-new', 'nuevo@estrategos.com', 'hash', 'Usuario Nuevo', true),
      ),
    } as jest.Mocked<UserRepository>;

    passwordHasher = {
      hash: jest.fn().mockResolvedValue('hashed-password'),
      verify: jest.fn(),
    } as jest.Mocked<PasswordHasherPort>;

    auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;

    getByTokenUseCase = new GetInvitationByTokenUseCase(
      invitationRepository,
      tokenPort,
      roleRepository,
      companyRepository,
    );

    acceptUseCase = new AcceptInvitationUseCase(
      invitationRepository,
      tokenPort,
      roleRepository,
      companyUserRepository,
      userRepository,
      passwordHasher,
      auditLogRepository,
      createFakeUnitOfWork(),
    );
  });

  it('GetInvitationByTokenUseCase: devuelve el preview de una invitación pendiente', async () => {
    invitationRepository.findByTokenHash.mockResolvedValue(makeInvitation());

    const result = await getByTokenUseCase.execute('plain-token');

    expect(result).toEqual({
      companyName: 'Empresa Piloto SRL',
      roleName: 'Empleado',
      email: 'nuevo@estrategos.com',
      status: 'pending',
    });
  });

  it('GetInvitationByTokenUseCase: rechaza un token inexistente', async () => {
    invitationRepository.findByTokenHash.mockResolvedValue(null);

    await expect(getByTokenUseCase.execute('no-existe')).rejects.toThrow(
      InvitationNotFoundError,
    );
  });

  it('AcceptInvitationUseCase: crea un User nuevo cuando el email no existe', async () => {
    invitationRepository.findByTokenHash.mockResolvedValue(makeInvitation());

    const result = await acceptUseCase.execute({
      token: 'plain-token',
      password: 'plain-password',
      fullName: 'Usuario Nuevo',
    });

    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'nuevo@estrategos.com', passwordHash: 'hashed-password' }),
      FAKE_TRANSACTION_CONTEXT,
    );
    expect(companyUserRepository.addMembership).toHaveBeenCalledWith(
      'user-new',
      'company-1',
      'Empleado',
      FAKE_TRANSACTION_CONTEXT,
    );
    expect(invitationRepository.markAccepted).toHaveBeenCalledWith(
      'inv-1',
      FAKE_TRANSACTION_CONTEXT,
    );
    expect(result.userId).toBe('user-new');
  });

  it('AcceptInvitationUseCase: reutiliza el User existente sin pisar su contraseña', async () => {
    const existingUser = new UserEntity(
      'user-existing',
      'nuevo@estrategos.com',
      'password-original',
      'Usuario Existente',
      true,
    );
    userRepository.findByEmail.mockResolvedValue(existingUser);
    invitationRepository.findByTokenHash.mockResolvedValue(makeInvitation());

    const result = await acceptUseCase.execute({
      token: 'plain-token',
      password: 'password-nueva-ignorada',
    });

    expect(userRepository.create).not.toHaveBeenCalled();
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(result.userId).toBe('user-existing');
  });

  it('AcceptInvitationUseCase: rechaza un token inexistente', async () => {
    invitationRepository.findByTokenHash.mockResolvedValue(null);

    await expect(
      acceptUseCase.execute({ token: 'no-existe', password: 'x', fullName: 'X' }),
    ).rejects.toThrow(InvitationNotFoundError);
  });

  it('AcceptInvitationUseCase: rechaza una invitación expirada (RN-USR-04)', async () => {
    invitationRepository.findByTokenHash.mockResolvedValue(
      makeInvitation({ expiresAt: new Date(Date.now() - 1000) }),
    );

    await expect(
      acceptUseCase.execute({ token: 'plain-token', password: 'x', fullName: 'X' }),
    ).rejects.toThrow(InvitationNotAcceptableError);
  });

  it('AcceptInvitationUseCase: rechaza una invitación ya aceptada', async () => {
    invitationRepository.findByTokenHash.mockResolvedValue(
      makeInvitation({ acceptedAt: new Date() }),
    );

    await expect(
      acceptUseCase.execute({ token: 'plain-token', password: 'x', fullName: 'X' }),
    ).rejects.toThrow(InvitationNotAcceptableError);
  });

  it('AcceptInvitationUseCase: rechaza una invitación revocada', async () => {
    invitationRepository.findByTokenHash.mockResolvedValue(
      makeInvitation({ revokedAt: new Date() }),
    );

    await expect(
      acceptUseCase.execute({ token: 'plain-token', password: 'x', fullName: 'X' }),
    ).rejects.toThrow(InvitationNotAcceptableError);
  });
});

describe('ListInvitationsUseCase', () => {
  it('lista las invitaciones de una empresa con el rol y el estado calculado', async () => {
    const invitationRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByTokenHash: jest.fn(),
      findPendingByEmailAndCompany: jest.fn(),
      findAllByCompany: jest.fn().mockResolvedValue([makeInvitation()]),
      markAccepted: jest.fn(),
      markRevoked: jest.fn(),
    } as jest.Mocked<InvitationRepository>;
    const roleRepository = {
      findAll: jest.fn().mockResolvedValue([new RoleEntity('role-1', 'Empleado', null)]),
      findById: jest.fn(),
    } as jest.Mocked<RoleRepository>;

    const useCase = new ListInvitationsUseCase(invitationRepository, roleRepository);
    const result = await useCase.execute('company-1');

    expect(result).toEqual([
      expect.objectContaining({ roleName: 'Empleado', status: 'pending' }),
    ]);
  });
});
