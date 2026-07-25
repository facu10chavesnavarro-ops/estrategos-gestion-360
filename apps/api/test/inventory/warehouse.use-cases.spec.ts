import { CreateWarehouseUseCase } from '../../src/modules/inventory/application/use-cases/create-warehouse.use-case';
import { UpdateWarehouseUseCase } from '../../src/modules/inventory/application/use-cases/update-warehouse.use-case';
import { DeactivateWarehouseUseCase } from '../../src/modules/inventory/application/use-cases/deactivate-warehouse.use-case';
import { ActivateWarehouseUseCase } from '../../src/modules/inventory/application/use-cases/activate-warehouse.use-case';
import { WarehouseEntity } from '../../src/modules/inventory/domain/entities/warehouse.entity';
import { WarehouseRepository } from '../../src/modules/inventory/domain/repositories/warehouse.repository';
import { BranchRepository } from '../../src/modules/companies/domain/repositories/branch.repository';
import { BranchEntity } from '../../src/modules/companies/domain/entities/branch.entity';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import {
  WarehouseNotFoundError,
  InvalidWarehouseBranchError,
  DuplicateWarehouseNameError,
  WarehouseAlreadyInTargetStateError,
} from '../../src/modules/inventory/domain/errors/warehouse.errors';
import {
  createFakeUnitOfWork,
  FAKE_TRANSACTION_CONTEXT,
} from '../support/fake-unit-of-work';

function makeWarehouse(overrides: Partial<WarehouseEntity> = {}): WarehouseEntity {
  return new WarehouseEntity(
    overrides.id ?? 'warehouse-1',
    overrides.companyId ?? 'company-1',
    overrides.branchId ?? 'branch-1',
    overrides.name ?? 'Depósito Principal',
    overrides.isActive ?? true,
  );
}

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

function makeWarehouseRepository(): jest.Mocked<WarehouseRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByBranchAndName: jest.fn(),
    findAllByBranch: jest.fn(),
    update: jest.fn(),
    setActive: jest.fn(),
  } as jest.Mocked<WarehouseRepository>;
}

function makeBranchRepository(): jest.Mocked<BranchRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByCompany: jest.fn(),
    update: jest.fn(),
    setActive: jest.fn(),
  } as jest.Mocked<BranchRepository>;
}

describe('CreateWarehouseUseCase', () => {
  it('crea el depósito cuando el rol autoriza y la sucursal es válida', async () => {
    const warehouseRepository = makeWarehouseRepository();
    const branchRepository = makeBranchRepository();
    branchRepository.findById.mockResolvedValue(makeBranch());
    warehouseRepository.findByBranchAndName.mockResolvedValue(null);
    warehouseRepository.create.mockResolvedValue(makeWarehouse());
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateWarehouseUseCase(
      warehouseRepository,
      branchRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      branchId: 'branch-1',
      name: 'Depósito Principal',
    });

    expect(result.name).toBe('Depósito Principal');
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'warehouse.create' }),
      FAKE_TRANSACTION_CONTEXT,
    );
  });

  it('rechaza si el rol no autoriza', async () => {
    const warehouseRepository = makeWarehouseRepository();
    const branchRepository = makeBranchRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateWarehouseUseCase(
      warehouseRepository,
      branchRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Empleado',
        companyId: 'company-1',
        branchId: 'branch-1',
        name: 'X',
      }),
    ).rejects.toThrow(RoleNotAuthorizedError);
  });

  it('RN-STK-01: rechaza una sucursal que no pertenece a la empresa', async () => {
    const warehouseRepository = makeWarehouseRepository();
    const branchRepository = makeBranchRepository();
    branchRepository.findById.mockResolvedValue(makeBranch({ companyId: 'otra-empresa' }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateWarehouseUseCase(
      warehouseRepository,
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
        name: 'X',
      }),
    ).rejects.toThrow(InvalidWarehouseBranchError);
  });

  it('RN-STK-02: rechaza un nombre duplicado en la misma sucursal', async () => {
    const warehouseRepository = makeWarehouseRepository();
    const branchRepository = makeBranchRepository();
    branchRepository.findById.mockResolvedValue(makeBranch());
    warehouseRepository.findByBranchAndName.mockResolvedValue(makeWarehouse());
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateWarehouseUseCase(
      warehouseRepository,
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
        name: 'Depósito Principal',
      }),
    ).rejects.toThrow(DuplicateWarehouseNameError);
  });
});

describe('UpdateWarehouseUseCase', () => {
  it('actualiza el nombre', async () => {
    const warehouseRepository = makeWarehouseRepository();
    warehouseRepository.findById.mockResolvedValue(makeWarehouse());
    warehouseRepository.findByBranchAndName.mockResolvedValue(null);
    warehouseRepository.update.mockResolvedValue(makeWarehouse({ name: 'Depósito Norte' }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateWarehouseUseCase(
      warehouseRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      warehouseId: 'warehouse-1',
      name: 'Depósito Norte',
    });

    expect(result.name).toBe('Depósito Norte');
  });

  it('rechaza si el depósito no existe', async () => {
    const warehouseRepository = makeWarehouseRepository();
    warehouseRepository.findById.mockResolvedValue(null);
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateWarehouseUseCase(
      warehouseRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        warehouseId: 'no-existe',
        name: 'X',
      }),
    ).rejects.toThrow(WarehouseNotFoundError);
  });
});

describe('DeactivateWarehouseUseCase / ActivateWarehouseUseCase', () => {
  it('desactiva un depósito activo', async () => {
    const warehouseRepository = makeWarehouseRepository();
    warehouseRepository.findById.mockResolvedValue(makeWarehouse({ isActive: true }));
    warehouseRepository.setActive.mockResolvedValue(makeWarehouse({ isActive: false }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new DeactivateWarehouseUseCase(
      warehouseRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      warehouseId: 'warehouse-1',
    });

    expect(result.isActive).toBe(false);
  });

  it('rechaza desactivar un depósito ya inactivo', async () => {
    const warehouseRepository = makeWarehouseRepository();
    warehouseRepository.findById.mockResolvedValue(makeWarehouse({ isActive: false }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new DeactivateWarehouseUseCase(
      warehouseRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        warehouseId: 'warehouse-1',
      }),
    ).rejects.toThrow(WarehouseAlreadyInTargetStateError);
  });

  it('reactiva un depósito inactivo', async () => {
    const warehouseRepository = makeWarehouseRepository();
    warehouseRepository.findById.mockResolvedValue(makeWarehouse({ isActive: false }));
    warehouseRepository.setActive.mockResolvedValue(makeWarehouse({ isActive: true }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new ActivateWarehouseUseCase(
      warehouseRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      warehouseId: 'warehouse-1',
    });

    expect(result.isActive).toBe(true);
  });
});
