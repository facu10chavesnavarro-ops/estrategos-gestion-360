import { CreateCompanyUseCase } from '../../src/modules/companies/application/use-cases/create-company.use-case';
import { UpdateCompanyUseCase } from '../../src/modules/companies/application/use-cases/update-company.use-case';
import { DeactivateCompanyUseCase } from '../../src/modules/companies/application/use-cases/deactivate-company.use-case';
import { ActivateCompanyUseCase } from '../../src/modules/companies/application/use-cases/activate-company.use-case';
import { CompanyEntity } from '../../src/modules/companies/domain/entities/company.entity';
import { CompanyRepository } from '../../src/modules/companies/domain/repositories/company.repository';
import { CompanyUserRepository } from '../../src/modules/companies/domain/repositories/company-user.repository';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import {
  InvalidTaxIdError,
  AlreadyInTargetStateError,
  CompanyNotFoundError,
} from '../../src/modules/companies/domain/errors/company.errors';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import {
  createFakeUnitOfWork,
  FAKE_TRANSACTION_CONTEXT,
} from '../support/fake-unit-of-work';

function makeCompany(overrides: Partial<CompanyEntity> = {}): CompanyEntity {
  return new CompanyEntity(
    overrides.id ?? 'company-1',
    overrides.tenantId ?? 'tenant-1',
    overrides.legalName ?? 'Empresa Piloto SRL',
    overrides.taxId ?? null,
    overrides.taxCondition ?? null,
    overrides.activity ?? null,
    overrides.address ?? null,
    overrides.contactName ?? null,
    overrides.contactEmail ?? null,
    overrides.contactPhone ?? null,
    overrides.logoUrl ?? null,
    overrides.currency ?? 'ARS',
    overrides.timezone ?? 'America/Argentina/Jujuy',
    overrides.allowNegativeStock ?? false,
    overrides.isActive ?? true,
  );
}

describe('CreateCompanyUseCase', () => {
  let companyRepository: jest.Mocked<CompanyRepository>;
  let companyUserRepository: jest.Mocked<CompanyUserRepository>;
  let auditLogRepository: jest.Mocked<AuditLogRepository>;
  let useCase: CreateCompanyUseCase;

  beforeEach(() => {
    companyRepository = {
      create: jest.fn().mockResolvedValue(makeCompany()),
      findAllForUser: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      setActive: jest.fn(),
    } as unknown as jest.Mocked<CompanyRepository>;

    companyUserRepository = {
      hasRoleInTenant: jest.fn(),
      addMembership: jest.fn(),
      hasActiveMembershipByEmail: jest.fn(),
      findAllByCompanyWithDetails: jest.fn(),
      findMembership: jest.fn(),
      findMembershipWithRoleName: jest.fn(),
      updateRole: jest.fn(),
      setActive: jest.fn(),
    } as jest.Mocked<CompanyUserRepository>;

    auditLogRepository = {
      record: jest.fn(),
    } as jest.Mocked<AuditLogRepository>;

    useCase = new CreateCompanyUseCase(
      companyRepository,
      companyUserRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );
  });

  it('crea la empresa cuando el usuario tiene rol autorizado en el tenant', async () => {
    companyUserRepository.hasRoleInTenant.mockResolvedValue(true);

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      tenantId: 'tenant-1',
      legalName: 'Empresa Nueva SRL',
    });

    expect(result.legalName).toBe('Empresa Piloto SRL');
    expect(companyUserRepository.addMembership).toHaveBeenCalledWith(
      'user-1',
      'company-1',
      'Administrador Estrategos',
      FAKE_TRANSACTION_CONTEXT,
    );
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'company.create' }),
      FAKE_TRANSACTION_CONTEXT,
    );
  });

  it('rechaza si el usuario no tiene rol autorizado en ningún company del tenant', async () => {
    companyUserRepository.hasRoleInTenant.mockResolvedValue(false);

    await expect(
      useCase.execute({
        requestingUserId: 'user-2',
        tenantId: 'tenant-1',
        legalName: 'Empresa Nueva SRL',
      }),
    ).rejects.toThrow(RoleNotAuthorizedError);

    expect(companyRepository.create).not.toHaveBeenCalled();
  });

  it('rechaza CUIT con formato inválido', async () => {
    companyUserRepository.hasRoleInTenant.mockResolvedValue(true);

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        tenantId: 'tenant-1',
        legalName: 'Empresa Nueva SRL',
        taxId: '123-abc',
      }),
    ).rejects.toThrow(InvalidTaxIdError);

    expect(companyRepository.create).not.toHaveBeenCalled();
  });

  it('acepta CUIT con formato válido, con o sin guiones', async () => {
    companyUserRepository.hasRoleInTenant.mockResolvedValue(true);

    await useCase.execute({
      requestingUserId: 'user-1',
      tenantId: 'tenant-1',
      legalName: 'Empresa Nueva SRL',
      taxId: '30-12345678-9',
    });

    expect(companyRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ taxId: '30-12345678-9' }),
      FAKE_TRANSACTION_CONTEXT,
    );
  });
});

describe('UpdateCompanyUseCase', () => {
  let companyRepository: jest.Mocked<CompanyRepository>;
  let auditLogRepository: jest.Mocked<AuditLogRepository>;
  let useCase: UpdateCompanyUseCase;

  beforeEach(() => {
    companyRepository = {
      create: jest.fn(),
      findAllForUser: jest.fn(),
      findById: jest.fn(),
      update: jest.fn().mockResolvedValue(makeCompany({ legalName: 'Actualizada' })),
      setActive: jest.fn(),
    } as unknown as jest.Mocked<CompanyRepository>;

    auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;

    useCase = new UpdateCompanyUseCase(
      companyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );
  });

  it('actualiza campos permitidos cuando el rol autoriza', async () => {
    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Administrador de empresa',
      companyId: 'company-1',
      legalName: 'Actualizada',
    });

    expect(result.legalName).toBe('Actualizada');
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'company.update' }),
      FAKE_TRANSACTION_CONTEXT,
    );
  });

  it.each(['Consultor', 'Auditor', 'Contador externo', 'Empleado'])(
    'rechaza edición si el rol es %s',
    async (roleName) => {
      await expect(
        useCase.execute({
          requestingUserId: 'user-1',
          requestingRoleName: roleName,
          companyId: 'company-1',
          legalName: 'Actualizada',
        }),
      ).rejects.toThrow(RoleNotAuthorizedError);

      expect(companyRepository.update).not.toHaveBeenCalled();
    },
  );

  it('rechaza CUIT con formato inválido', async () => {
    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        taxId: 'no-es-un-cuit',
      }),
    ).rejects.toThrow(InvalidTaxIdError);
  });
});

describe('DeactivateCompanyUseCase / ActivateCompanyUseCase', () => {
  let companyRepository: jest.Mocked<CompanyRepository>;
  let auditLogRepository: jest.Mocked<AuditLogRepository>;
  let deactivateUseCase: DeactivateCompanyUseCase;
  let activateUseCase: ActivateCompanyUseCase;

  beforeEach(() => {
    companyRepository = {
      create: jest.fn(),
      findAllForUser: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      setActive: jest.fn(),
    } as unknown as jest.Mocked<CompanyRepository>;

    auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;

    deactivateUseCase = new DeactivateCompanyUseCase(
      companyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );
    activateUseCase = new ActivateCompanyUseCase(
      companyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );
  });

  it('desactiva una empresa activa y audita el motivo', async () => {
    companyRepository.findById.mockResolvedValue(makeCompany({ isActive: true }));
    companyRepository.setActive.mockResolvedValue(makeCompany({ isActive: false }));

    const result = await deactivateUseCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      reason: 'Cliente dio de baja el servicio',
    });

    expect(result.isActive).toBe(false);
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'company.deactivate',
        metadata: { reason: 'Cliente dio de baja el servicio' },
      }),
      FAKE_TRANSACTION_CONTEXT,
    );
  });

  it('rechaza desactivar una empresa ya inactiva (RN-EMP-06)', async () => {
    companyRepository.findById.mockResolvedValue(makeCompany({ isActive: false }));

    await expect(
      deactivateUseCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        reason: 'motivo',
      }),
    ).rejects.toThrow(AlreadyInTargetStateError);

    expect(companyRepository.setActive).not.toHaveBeenCalled();
  });

  it('rechaza desactivar una empresa inexistente', async () => {
    companyRepository.findById.mockResolvedValue(null);

    await expect(
      deactivateUseCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'no-existe',
        reason: 'motivo',
      }),
    ).rejects.toThrow(CompanyNotFoundError);
  });

  it('reactiva una empresa inactiva', async () => {
    companyRepository.findById.mockResolvedValue(makeCompany({ isActive: false }));
    companyRepository.setActive.mockResolvedValue(makeCompany({ isActive: true }));

    const result = await activateUseCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
    });

    expect(result.isActive).toBe(true);
  });

  it('rechaza activar una empresa ya activa (RN-EMP-06)', async () => {
    companyRepository.findById.mockResolvedValue(makeCompany({ isActive: true }));

    await expect(
      activateUseCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
      }),
    ).rejects.toThrow(AlreadyInTargetStateError);
  });

  it.each(['Consultor', 'Auditor'])(
    'rechaza desactivar/activar si el rol es %s',
    async (roleName) => {
      await expect(
        deactivateUseCase.execute({
          requestingUserId: 'user-1',
          requestingRoleName: roleName,
          companyId: 'company-1',
          reason: 'motivo',
        }),
      ).rejects.toThrow(RoleNotAuthorizedError);
    },
  );
});
