import { CreateCashRegisterUseCase } from '../../src/modules/treasury/application/use-cases/create-cash-register.use-case';
import { UpdateCashRegisterUseCase } from '../../src/modules/treasury/application/use-cases/update-cash-register.use-case';
import { DeactivateCashRegisterUseCase } from '../../src/modules/treasury/application/use-cases/deactivate-cash-register.use-case';
import { ActivateCashRegisterUseCase } from '../../src/modules/treasury/application/use-cases/activate-cash-register.use-case';
import { ListCashRegistersUseCase } from '../../src/modules/treasury/application/use-cases/list-cash-registers.use-case';
import { CashRegisterEntity } from '../../src/modules/treasury/domain/entities/cash-register.entity';
import { CashRegisterRepository } from '../../src/modules/treasury/domain/repositories/cash-register.repository';
import { ChartOfAccountRepository } from '../../src/modules/accounting/domain/repositories/chart-of-account.repository';
import { BranchRepository } from '../../src/modules/companies/domain/repositories/branch.repository';
import { BranchEntity } from '../../src/modules/companies/domain/entities/branch.entity';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import {
  CashRegisterNotFoundError,
  InvalidCashRegisterBranchError,
  CashRegisterAlreadyInTargetStateError,
} from '../../src/modules/treasury/domain/errors/cash.errors';
import { createFakeUnitOfWork } from '../support/fake-unit-of-work';

function makeCashRegister(overrides: Partial<CashRegisterEntity> = {}): CashRegisterEntity {
  return new CashRegisterEntity(
    overrides.id ?? 'register-1',
    overrides.companyId ?? 'company-1',
    overrides.branchId ?? 'branch-1',
    overrides.name ?? 'Caja Principal',
    overrides.isActive ?? true,
    overrides.accountId ?? null,
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

function makeCashRegisterRepository(): jest.Mocked<CashRegisterRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByBranch: jest.fn(),
    update: jest.fn(),
    setActive: jest.fn(),
  } as jest.Mocked<CashRegisterRepository>;
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

describe('CreateCashRegisterUseCase', () => {
  it('crea la caja cuando el rol autoriza y la sucursal es válida', async () => {
    const cashRegisterRepository = makeCashRegisterRepository();
    const branchRepository = makeBranchRepository();
    branchRepository.findById.mockResolvedValue(makeBranch());
    cashRegisterRepository.create.mockResolvedValue(makeCashRegister());
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateCashRegisterUseCase(
      cashRegisterRepository,
      branchRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      branchId: 'branch-1',
      name: 'Caja Principal',
    });

    expect(result.name).toBe('Caja Principal');
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'cash_register.create' }),
      expect.anything(),
    );
  });

  it('rechaza si el rol no autoriza', async () => {
    const cashRegisterRepository = makeCashRegisterRepository();
    const branchRepository = makeBranchRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateCashRegisterUseCase(
      cashRegisterRepository,
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

  it('RN-CASH-01: rechaza una sucursal que no pertenece a la empresa', async () => {
    const cashRegisterRepository = makeCashRegisterRepository();
    const branchRepository = makeBranchRepository();
    branchRepository.findById.mockResolvedValue(makeBranch({ companyId: 'otra-empresa' }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateCashRegisterUseCase(
      cashRegisterRepository,
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
    ).rejects.toThrow(InvalidCashRegisterBranchError);
  });
});

describe('UpdateCashRegisterUseCase', () => {
  it('actualiza el nombre', async () => {
    const cashRegisterRepository = makeCashRegisterRepository();
    cashRegisterRepository.findById.mockResolvedValue(makeCashRegister());
    cashRegisterRepository.update.mockResolvedValue(makeCashRegister({ name: 'Caja Norte' }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateCashRegisterUseCase(
      cashRegisterRepository,
      {
        create: jest.fn(),
        findById: jest.fn(),
        findByCode: jest.fn(),
        findAllByCompany: jest.fn(),
        update: jest.fn(),
        setActive: jest.fn(),
      } as jest.Mocked<ChartOfAccountRepository>,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      cashRegisterId: 'register-1',
      name: 'Caja Norte',
    });

    expect(result.name).toBe('Caja Norte');
  });

  it('rechaza si la caja no existe', async () => {
    const cashRegisterRepository = makeCashRegisterRepository();
    cashRegisterRepository.findById.mockResolvedValue(null);
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateCashRegisterUseCase(
      cashRegisterRepository,
      {
        create: jest.fn(),
        findById: jest.fn(),
        findByCode: jest.fn(),
        findAllByCompany: jest.fn(),
        update: jest.fn(),
        setActive: jest.fn(),
      } as jest.Mocked<ChartOfAccountRepository>,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        cashRegisterId: 'no-existe',
        name: 'X',
      }),
    ).rejects.toThrow(CashRegisterNotFoundError);
  });
});

// Auditoría de seguridad (hallazgo A1, IDOR): `findAllByBranch` ahora exige
// companyId — el use case debe reenviar siempre el del contexto verificado.
// La exclusión real de filas de otra empresa se prueba contra DB real en
// test/security/multi-tenant-isolation.integration-spec.ts.
describe('ListCashRegistersUseCase', () => {
  it('lista las cajas de una sucursal', async () => {
    const cashRegisterRepository = makeCashRegisterRepository();
    cashRegisterRepository.findAllByBranch.mockResolvedValue([makeCashRegister()]);
    const useCase = new ListCashRegistersUseCase(cashRegisterRepository);

    const result = await useCase.execute('branch-1', 'company-1');

    expect(result).toHaveLength(1);
    expect(cashRegisterRepository.findAllByBranch).toHaveBeenCalledWith('branch-1', 'company-1');
  });

  it('reenvía el companyId del contexto al repositorio, nunca uno distinto', async () => {
    const cashRegisterRepository = makeCashRegisterRepository();
    cashRegisterRepository.findAllByBranch.mockResolvedValue([]);
    const useCase = new ListCashRegistersUseCase(cashRegisterRepository);

    await useCase.execute('branch-de-otra-empresa', 'company-1');

    expect(cashRegisterRepository.findAllByBranch).toHaveBeenCalledWith(
      'branch-de-otra-empresa',
      'company-1',
    );
    expect(cashRegisterRepository.findAllByBranch).not.toHaveBeenCalledWith(
      'branch-de-otra-empresa',
      'otra-empresa',
    );
  });
});

describe('DeactivateCashRegisterUseCase / ActivateCashRegisterUseCase', () => {
  it('desactiva una caja activa', async () => {
    const cashRegisterRepository = makeCashRegisterRepository();
    cashRegisterRepository.findById.mockResolvedValue(makeCashRegister({ isActive: true }));
    cashRegisterRepository.setActive.mockResolvedValue(makeCashRegister({ isActive: false }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new DeactivateCashRegisterUseCase(
      cashRegisterRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      cashRegisterId: 'register-1',
    });

    expect(result.isActive).toBe(false);
  });

  it('rechaza desactivar una caja ya inactiva', async () => {
    const cashRegisterRepository = makeCashRegisterRepository();
    cashRegisterRepository.findById.mockResolvedValue(makeCashRegister({ isActive: false }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new DeactivateCashRegisterUseCase(
      cashRegisterRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        cashRegisterId: 'register-1',
      }),
    ).rejects.toThrow(CashRegisterAlreadyInTargetStateError);
  });

  it('reactiva una caja inactiva', async () => {
    const cashRegisterRepository = makeCashRegisterRepository();
    cashRegisterRepository.findById.mockResolvedValue(makeCashRegister({ isActive: false }));
    cashRegisterRepository.setActive.mockResolvedValue(makeCashRegister({ isActive: true }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new ActivateCashRegisterUseCase(
      cashRegisterRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      cashRegisterId: 'register-1',
    });

    expect(result.isActive).toBe(true);
  });
});
