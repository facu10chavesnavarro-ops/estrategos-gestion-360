import { CreateBranchUseCase } from '../../src/modules/companies/application/use-cases/create-branch.use-case';
import { UpdateBranchUseCase } from '../../src/modules/companies/application/use-cases/update-branch.use-case';
import { ListBranchesUseCase } from '../../src/modules/companies/application/use-cases/list-branches.use-case';
import { DeactivateBranchUseCase } from '../../src/modules/companies/application/use-cases/deactivate-branch.use-case';
import { ActivateBranchUseCase } from '../../src/modules/companies/application/use-cases/activate-branch.use-case';
import { BranchEntity } from '../../src/modules/companies/domain/entities/branch.entity';
import { BranchRepository } from '../../src/modules/companies/domain/repositories/branch.repository';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import {
  BranchNotFoundError,
  AlreadyInTargetStateError,
} from '../../src/modules/companies/domain/errors/company.errors';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import {
  createFakeUnitOfWork,
  FAKE_TRANSACTION_CONTEXT,
} from '../support/fake-unit-of-work';

function makeBranch(overrides: Partial<BranchEntity> = {}): BranchEntity {
  return new BranchEntity(
    overrides.id ?? 'branch-1',
    overrides.companyId ?? 'company-1',
    overrides.name ?? 'Casa Central',
    overrides.address ?? null,
    overrides.phone ?? null,
    overrides.isActive ?? true,
  );
}

function makeBranchRepository(): jest.Mocked<BranchRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByCompany: jest.fn(),
    update: jest.fn(),
    setActive: jest.fn(),
  } as unknown as jest.Mocked<BranchRepository>;
}

describe('CreateBranchUseCase', () => {
  it('crea la sucursal cuando el rol autoriza', async () => {
    const branchRepository = makeBranchRepository();
    branchRepository.create.mockResolvedValue(makeBranch());
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateBranchUseCase(
      branchRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Administrador de empresa',
      companyId: 'company-1',
      name: 'Casa Central',
    });

    expect(result.name).toBe('Casa Central');
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'branch.create', companyId: 'company-1' }),
      FAKE_TRANSACTION_CONTEXT,
    );
  });

  it('rechaza si el rol no autoriza', async () => {
    const branchRepository = makeBranchRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateBranchUseCase(
      branchRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Empleado',
        companyId: 'company-1',
        name: 'Casa Central',
      }),
    ).rejects.toThrow(RoleNotAuthorizedError);

    expect(branchRepository.create).not.toHaveBeenCalled();
  });
});

describe('UpdateBranchUseCase', () => {
  it('actualiza la sucursal cuando pertenece a la empresa del contexto', async () => {
    const branchRepository = makeBranchRepository();
    branchRepository.findById.mockResolvedValue(makeBranch({ companyId: 'company-1' }));
    branchRepository.update.mockResolvedValue(makeBranch({ name: 'Sucursal Norte' }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateBranchUseCase(
      branchRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      branchId: 'branch-1',
      name: 'Sucursal Norte',
    });

    expect(result.name).toBe('Sucursal Norte');
  });

  it('rechaza si la sucursal pertenece a otra empresa (RN-EMP-09)', async () => {
    const branchRepository = makeBranchRepository();
    branchRepository.findById.mockResolvedValue(makeBranch({ companyId: 'otra-empresa' }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateBranchUseCase(
      branchRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        branchId: 'branch-1',
        name: 'Sucursal Norte',
      }),
    ).rejects.toThrow(BranchNotFoundError);
  });

  it('rechaza si la sucursal no existe', async () => {
    const branchRepository = makeBranchRepository();
    branchRepository.findById.mockResolvedValue(null);
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateBranchUseCase(
      branchRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        branchId: 'no-existe',
        name: 'Sucursal Norte',
      }),
    ).rejects.toThrow(BranchNotFoundError);
  });
});

describe('ListBranchesUseCase', () => {
  it('lista las sucursales de la empresa', async () => {
    const branchRepository = makeBranchRepository();
    branchRepository.findAllByCompany.mockResolvedValue([makeBranch(), makeBranch({ id: 'branch-2' })]);
    const useCase = new ListBranchesUseCase(branchRepository);

    const result = await useCase.execute('company-1');

    expect(result).toHaveLength(2);
    expect(branchRepository.findAllByCompany).toHaveBeenCalledWith('company-1');
  });
});

describe('DeactivateBranchUseCase / ActivateBranchUseCase', () => {
  it('desactiva una sucursal activa y audita el motivo', async () => {
    const branchRepository = makeBranchRepository();
    branchRepository.findById.mockResolvedValue(makeBranch({ isActive: true }));
    branchRepository.setActive.mockResolvedValue(makeBranch({ isActive: false }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new DeactivateBranchUseCase(
      branchRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      branchId: 'branch-1',
      reason: 'Cierre de sucursal',
    });

    expect(result.isActive).toBe(false);
  });

  it('rechaza desactivar una sucursal ya inactiva (RN-EMP-06)', async () => {
    const branchRepository = makeBranchRepository();
    branchRepository.findById.mockResolvedValue(makeBranch({ isActive: false }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new DeactivateBranchUseCase(
      branchRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        branchId: 'branch-1',
        reason: 'motivo',
      }),
    ).rejects.toThrow(AlreadyInTargetStateError);
  });

  it('reactiva una sucursal inactiva', async () => {
    const branchRepository = makeBranchRepository();
    branchRepository.findById.mockResolvedValue(makeBranch({ isActive: false }));
    branchRepository.setActive.mockResolvedValue(makeBranch({ isActive: true }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new ActivateBranchUseCase(
      branchRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      branchId: 'branch-1',
    });

    expect(result.isActive).toBe(true);
  });

  it('rechaza si la sucursal a activar pertenece a otra empresa', async () => {
    const branchRepository = makeBranchRepository();
    branchRepository.findById.mockResolvedValue(makeBranch({ companyId: 'otra-empresa' }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new ActivateBranchUseCase(
      branchRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        branchId: 'branch-1',
      }),
    ).rejects.toThrow(BranchNotFoundError);
  });
});
