import { CreatePointOfSaleUseCase } from '../../src/modules/vouchers/application/use-cases/create-point-of-sale.use-case';
import { UpdatePointOfSaleUseCase } from '../../src/modules/vouchers/application/use-cases/update-point-of-sale.use-case';
import { DeactivatePointOfSaleUseCase } from '../../src/modules/vouchers/application/use-cases/deactivate-point-of-sale.use-case';
import { ActivatePointOfSaleUseCase } from '../../src/modules/vouchers/application/use-cases/activate-point-of-sale.use-case';
import { PointOfSaleEntity } from '../../src/modules/vouchers/domain/entities/point-of-sale.entity';
import { PointOfSaleRepository } from '../../src/modules/vouchers/domain/repositories/point-of-sale.repository';
import { BranchRepository } from '../../src/modules/companies/domain/repositories/branch.repository';
import { BranchEntity } from '../../src/modules/companies/domain/entities/branch.entity';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import {
  PointOfSaleNotFoundError,
  InvalidPointOfSaleBranchError,
  DuplicatePointOfSaleCodeError,
  PointOfSaleAlreadyInTargetStateError,
} from '../../src/modules/vouchers/domain/errors/point-of-sale.errors';
import { createFakeUnitOfWork, FAKE_TRANSACTION_CONTEXT } from '../support/fake-unit-of-work';

function makePointOfSale(overrides: Partial<PointOfSaleEntity> = {}): PointOfSaleEntity {
  return new PointOfSaleEntity(
    overrides.id ?? 'pos-1',
    overrides.companyId ?? 'company-1',
    overrides.branchId ?? 'branch-1',
    overrides.code ?? '0001',
    overrides.name ?? 'Casa Central',
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

function makePointOfSaleRepository(): jest.Mocked<PointOfSaleRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByCompanyAndCode: jest.fn(),
    findAllByBranch: jest.fn(),
    update: jest.fn(),
    setActive: jest.fn(),
  } as jest.Mocked<PointOfSaleRepository>;
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

describe('CreatePointOfSaleUseCase', () => {
  it('crea el punto de venta cuando el rol autoriza y la sucursal es válida', async () => {
    const pointOfSaleRepository = makePointOfSaleRepository();
    const branchRepository = makeBranchRepository();
    branchRepository.findById.mockResolvedValue(makeBranch());
    pointOfSaleRepository.findByCompanyAndCode.mockResolvedValue(null);
    pointOfSaleRepository.create.mockResolvedValue(makePointOfSale());
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreatePointOfSaleUseCase(
      pointOfSaleRepository,
      branchRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      branchId: 'branch-1',
      code: '0001',
      name: 'Casa Central',
    });

    expect(result.code).toBe('0001');
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'point_of_sale.create' }),
      FAKE_TRANSACTION_CONTEXT,
    );
  });

  it('rechaza si el rol no autoriza', async () => {
    const pointOfSaleRepository = makePointOfSaleRepository();
    const branchRepository = makeBranchRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreatePointOfSaleUseCase(
      pointOfSaleRepository,
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
        code: '0001',
        name: 'X',
      }),
    ).rejects.toThrow(RoleNotAuthorizedError);
  });

  it('RN-VOU-01: rechaza una sucursal que no pertenece a la empresa', async () => {
    const pointOfSaleRepository = makePointOfSaleRepository();
    const branchRepository = makeBranchRepository();
    branchRepository.findById.mockResolvedValue(makeBranch({ companyId: 'otra-empresa' }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreatePointOfSaleUseCase(
      pointOfSaleRepository,
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
        code: '0001',
        name: 'X',
      }),
    ).rejects.toThrow(InvalidPointOfSaleBranchError);
  });

  it('rechaza un código duplicado en la misma empresa', async () => {
    const pointOfSaleRepository = makePointOfSaleRepository();
    const branchRepository = makeBranchRepository();
    branchRepository.findById.mockResolvedValue(makeBranch());
    pointOfSaleRepository.findByCompanyAndCode.mockResolvedValue(makePointOfSale());
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreatePointOfSaleUseCase(
      pointOfSaleRepository,
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
        code: '0001',
        name: 'Casa Central',
      }),
    ).rejects.toThrow(DuplicatePointOfSaleCodeError);
  });
});

describe('UpdatePointOfSaleUseCase', () => {
  it('actualiza el nombre', async () => {
    const pointOfSaleRepository = makePointOfSaleRepository();
    pointOfSaleRepository.findById.mockResolvedValue(makePointOfSale());
    pointOfSaleRepository.update.mockResolvedValue(makePointOfSale({ name: 'Sucursal Norte' }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdatePointOfSaleUseCase(
      pointOfSaleRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      pointOfSaleId: 'pos-1',
      name: 'Sucursal Norte',
    });

    expect(result.name).toBe('Sucursal Norte');
  });

  it('rechaza si el punto de venta no existe', async () => {
    const pointOfSaleRepository = makePointOfSaleRepository();
    pointOfSaleRepository.findById.mockResolvedValue(null);
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdatePointOfSaleUseCase(
      pointOfSaleRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        pointOfSaleId: 'no-existe',
        name: 'X',
      }),
    ).rejects.toThrow(PointOfSaleNotFoundError);
  });
});

describe('DeactivatePointOfSaleUseCase / ActivatePointOfSaleUseCase', () => {
  it('desactiva un punto de venta activo', async () => {
    const pointOfSaleRepository = makePointOfSaleRepository();
    pointOfSaleRepository.findById.mockResolvedValue(makePointOfSale({ isActive: true }));
    pointOfSaleRepository.setActive.mockResolvedValue(makePointOfSale({ isActive: false }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new DeactivatePointOfSaleUseCase(
      pointOfSaleRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      pointOfSaleId: 'pos-1',
    });

    expect(result.isActive).toBe(false);
  });

  it('rechaza desactivar un punto de venta ya inactivo', async () => {
    const pointOfSaleRepository = makePointOfSaleRepository();
    pointOfSaleRepository.findById.mockResolvedValue(makePointOfSale({ isActive: false }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new DeactivatePointOfSaleUseCase(
      pointOfSaleRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        pointOfSaleId: 'pos-1',
      }),
    ).rejects.toThrow(PointOfSaleAlreadyInTargetStateError);
  });

  it('reactiva un punto de venta inactivo', async () => {
    const pointOfSaleRepository = makePointOfSaleRepository();
    pointOfSaleRepository.findById.mockResolvedValue(makePointOfSale({ isActive: false }));
    pointOfSaleRepository.setActive.mockResolvedValue(makePointOfSale({ isActive: true }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new ActivatePointOfSaleUseCase(
      pointOfSaleRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      pointOfSaleId: 'pos-1',
    });

    expect(result.isActive).toBe(true);
  });
});
