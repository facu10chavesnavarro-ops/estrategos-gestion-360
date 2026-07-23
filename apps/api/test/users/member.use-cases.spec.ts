import { ChangeMemberRoleUseCase } from '../../src/modules/users/application/use-cases/change-member-role.use-case';
import { DeactivateMemberUseCase } from '../../src/modules/users/application/use-cases/deactivate-member.use-case';
import { ActivateMemberUseCase } from '../../src/modules/users/application/use-cases/activate-member.use-case';
import { ListCompanyMembersUseCase } from '../../src/modules/users/application/use-cases/list-company-members.use-case';
import { ListRolesUseCase } from '../../src/modules/users/application/use-cases/list-roles.use-case';
import { RoleEntity } from '../../src/modules/users/domain/entities/role.entity';
import { CompanyUserRepository } from '../../src/modules/companies/domain/repositories/company-user.repository';
import { RoleRepository } from '../../src/modules/users/domain/repositories/role.repository';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import {
  MemberNotFoundError,
  CannotModifySelfError,
  MemberAlreadyInTargetStateError,
} from '../../src/modules/users/domain/errors/user-management.errors';

function makeCompanyUserRepository(): jest.Mocked<CompanyUserRepository> {
  return {
    hasRoleInTenant: jest.fn(),
    addMembership: jest.fn(),
    hasActiveMembershipByEmail: jest.fn(),
    findAllByCompanyWithDetails: jest.fn(),
    findMembership: jest.fn(),
    updateRole: jest.fn(),
    setActive: jest.fn(),
  } as jest.Mocked<CompanyUserRepository>;
}

describe('ChangeMemberRoleUseCase', () => {
  it('cambia el rol cuando el solicitante autoriza', async () => {
    const companyUserRepository = makeCompanyUserRepository();
    companyUserRepository.findMembership.mockResolvedValue({
      roleId: 'role-old',
      isActive: true,
    });
    const roleRepository = {
      findAll: jest.fn(),
      findById: jest.fn().mockResolvedValue(new RoleEntity('role-new', 'Auditor', null)),
    } as jest.Mocked<RoleRepository>;
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new ChangeMemberRoleUseCase(
      companyUserRepository,
      roleRepository,
      auditLogRepository,
    );

    await useCase.execute({
      requestingUserId: 'user-admin',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      targetUserId: 'user-target',
      roleId: 'role-new',
    });

    expect(companyUserRepository.updateRole).toHaveBeenCalledWith(
      'user-target',
      'company-1',
      'role-new',
    );
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'member.role_change',
        metadata: { previousRoleId: 'role-old', newRoleId: 'role-new' },
      }),
    );
  });

  it('rechaza auto-modificación (RN-USR-12)', async () => {
    const companyUserRepository = makeCompanyUserRepository();
    const roleRepository = { findAll: jest.fn(), findById: jest.fn() } as jest.Mocked<RoleRepository>;
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new ChangeMemberRoleUseCase(
      companyUserRepository,
      roleRepository,
      auditLogRepository,
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-admin',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        targetUserId: 'user-admin',
        roleId: 'role-new',
      }),
    ).rejects.toThrow(CannotModifySelfError);
  });

  it('rechaza si el rol del solicitante no autoriza', async () => {
    const companyUserRepository = makeCompanyUserRepository();
    const roleRepository = { findAll: jest.fn(), findById: jest.fn() } as jest.Mocked<RoleRepository>;
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new ChangeMemberRoleUseCase(
      companyUserRepository,
      roleRepository,
      auditLogRepository,
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Empleado',
        companyId: 'company-1',
        targetUserId: 'user-target',
        roleId: 'role-new',
      }),
    ).rejects.toThrow(RoleNotAuthorizedError);
  });

  it('rechaza si el usuario objetivo no es miembro de la empresa', async () => {
    const companyUserRepository = makeCompanyUserRepository();
    companyUserRepository.findMembership.mockResolvedValue(null);
    const roleRepository = { findAll: jest.fn(), findById: jest.fn() } as jest.Mocked<RoleRepository>;
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new ChangeMemberRoleUseCase(
      companyUserRepository,
      roleRepository,
      auditLogRepository,
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-admin',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        targetUserId: 'no-es-miembro',
        roleId: 'role-new',
      }),
    ).rejects.toThrow(MemberNotFoundError);
  });
});

describe('DeactivateMemberUseCase / ActivateMemberUseCase', () => {
  it('desactiva un miembro activo', async () => {
    const companyUserRepository = makeCompanyUserRepository();
    companyUserRepository.findMembership.mockResolvedValue({
      roleId: 'role-1',
      isActive: true,
    });
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new DeactivateMemberUseCase(companyUserRepository, auditLogRepository);

    await useCase.execute({
      requestingUserId: 'user-admin',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      targetUserId: 'user-target',
    });

    expect(companyUserRepository.setActive).toHaveBeenCalledWith(
      'user-target',
      'company-1',
      false,
    );
  });

  it('rechaza auto-desactivación (RN-USR-12)', async () => {
    const companyUserRepository = makeCompanyUserRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new DeactivateMemberUseCase(companyUserRepository, auditLogRepository);

    await expect(
      useCase.execute({
        requestingUserId: 'user-admin',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        targetUserId: 'user-admin',
      }),
    ).rejects.toThrow(CannotModifySelfError);
  });

  it('rechaza desactivar un miembro ya inactivo (RN-USR-09)', async () => {
    const companyUserRepository = makeCompanyUserRepository();
    companyUserRepository.findMembership.mockResolvedValue({
      roleId: 'role-1',
      isActive: false,
    });
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new DeactivateMemberUseCase(companyUserRepository, auditLogRepository);

    await expect(
      useCase.execute({
        requestingUserId: 'user-admin',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        targetUserId: 'user-target',
      }),
    ).rejects.toThrow(MemberAlreadyInTargetStateError);
  });

  it('reactiva un miembro inactivo', async () => {
    const companyUserRepository = makeCompanyUserRepository();
    companyUserRepository.findMembership.mockResolvedValue({
      roleId: 'role-1',
      isActive: false,
    });
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new ActivateMemberUseCase(companyUserRepository, auditLogRepository);

    await useCase.execute({
      requestingUserId: 'user-admin',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      targetUserId: 'user-target',
    });

    expect(companyUserRepository.setActive).toHaveBeenCalledWith(
      'user-target',
      'company-1',
      true,
    );
  });
});

describe('ListCompanyMembersUseCase', () => {
  it('lista los miembros de la empresa con usuario y rol resueltos', async () => {
    const companyUserRepository = makeCompanyUserRepository();
    companyUserRepository.findAllByCompanyWithDetails.mockResolvedValue([
      {
        userId: 'user-1',
        email: 'a@x.com',
        fullName: 'A',
        roleId: 'role-1',
        roleName: 'Propietario',
        isActive: true,
      },
    ]);
    const useCase = new ListCompanyMembersUseCase(companyUserRepository);

    const result = await useCase.execute('company-1');

    expect(result).toHaveLength(1);
    expect(result[0].roleName).toBe('Propietario');
  });
});

describe('ListRolesUseCase', () => {
  it('lista el catálogo de roles', async () => {
    const roleRepository = {
      findAll: jest.fn().mockResolvedValue([new RoleEntity('role-1', 'Auditor', null)]),
      findById: jest.fn(),
    } as jest.Mocked<RoleRepository>;
    const useCase = new ListRolesUseCase(roleRepository);

    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Auditor');
  });
});
