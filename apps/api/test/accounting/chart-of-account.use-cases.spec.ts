import { CreateChartOfAccountUseCase } from '../../src/modules/accounting/application/use-cases/create-chart-of-account.use-case';
import { UpdateChartOfAccountUseCase } from '../../src/modules/accounting/application/use-cases/update-chart-of-account.use-case';
import { DeactivateChartOfAccountUseCase } from '../../src/modules/accounting/application/use-cases/deactivate-chart-of-account.use-case';
import { ActivateChartOfAccountUseCase } from '../../src/modules/accounting/application/use-cases/activate-chart-of-account.use-case';
import { GetChartOfAccountByIdUseCase } from '../../src/modules/accounting/application/use-cases/get-chart-of-account-by-id.use-case';
import { ListChartOfAccountsUseCase } from '../../src/modules/accounting/application/use-cases/list-chart-of-accounts.use-case';
import { ChartOfAccountEntity } from '../../src/modules/accounting/domain/entities/chart-of-account.entity';
import { ChartOfAccountRepository } from '../../src/modules/accounting/domain/repositories/chart-of-account.repository';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import {
  ChartOfAccountNotFoundError,
  InvalidParentAccountError,
  AccountCycleError,
  DuplicateAccountCodeError,
  ChartOfAccountAlreadyInTargetStateError,
  SystemAccountCannotBeDeactivatedError,
} from '../../src/modules/accounting/domain/errors/accounting.errors';
import { createFakeUnitOfWork } from '../support/fake-unit-of-work';

function makeAccount(overrides: Partial<ChartOfAccountEntity> = {}): ChartOfAccountEntity {
  return new ChartOfAccountEntity(
    overrides.id ?? 'account-1',
    overrides.companyId ?? 'company-1',
    overrides.parentId ?? null,
    overrides.code ?? '1.1.01',
    overrides.name ?? 'Caja',
    overrides.type ?? 'ASSET',
    overrides.allowsMovements ?? true,
    overrides.isSystemAccount ?? false,
    overrides.isActive ?? true,
  );
}

function makeChartOfAccountRepository(): jest.Mocked<ChartOfAccountRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByCode: jest.fn(),
    findAllByCompany: jest.fn(),
    update: jest.fn(),
    setActive: jest.fn(),
  } as jest.Mocked<ChartOfAccountRepository>;
}

describe('CreateChartOfAccountUseCase', () => {
  it('crea la cuenta cuando el rol autoriza', async () => {
    const chartOfAccountRepository = makeChartOfAccountRepository();
    chartOfAccountRepository.findByCode.mockResolvedValue(null);
    chartOfAccountRepository.create.mockResolvedValue(makeAccount());
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateChartOfAccountUseCase(
      chartOfAccountRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      code: '1.1.01',
      name: 'Caja',
      type: 'ASSET',
    });

    expect(result.code).toBe('1.1.01');
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'chart_of_account.create' }),
      expect.anything(),
    );
  });

  it('rechaza si el rol no autoriza', async () => {
    const chartOfAccountRepository = makeChartOfAccountRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateChartOfAccountUseCase(
      chartOfAccountRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Empleado',
        companyId: 'company-1',
        code: '1.1.01',
        name: 'Caja',
        type: 'ASSET',
      }),
    ).rejects.toThrow(RoleNotAuthorizedError);
  });

  it('rechaza un código duplicado en la misma empresa', async () => {
    const chartOfAccountRepository = makeChartOfAccountRepository();
    chartOfAccountRepository.findByCode.mockResolvedValue(makeAccount());
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateChartOfAccountUseCase(
      chartOfAccountRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        code: '1.1.01',
        name: 'Caja',
        type: 'ASSET',
      }),
    ).rejects.toThrow(DuplicateAccountCodeError);
  });

  it('rechaza un parentId que no existe en la empresa', async () => {
    const chartOfAccountRepository = makeChartOfAccountRepository();
    chartOfAccountRepository.findByCode.mockResolvedValue(null);
    chartOfAccountRepository.findById.mockResolvedValue(null);
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateChartOfAccountUseCase(
      chartOfAccountRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        parentId: 'no-existe',
        code: '1.1.01',
        name: 'Caja',
        type: 'ASSET',
      }),
    ).rejects.toThrow(InvalidParentAccountError);
  });
});

describe('UpdateChartOfAccountUseCase', () => {
  it('actualiza el nombre', async () => {
    const chartOfAccountRepository = makeChartOfAccountRepository();
    chartOfAccountRepository.findById.mockResolvedValue(makeAccount());
    chartOfAccountRepository.update.mockResolvedValue(makeAccount({ name: 'Caja Chica' }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateChartOfAccountUseCase(
      chartOfAccountRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      accountId: 'account-1',
      name: 'Caja Chica',
    });

    expect(result.name).toBe('Caja Chica');
  });

  it('rechaza si la cuenta no existe', async () => {
    const chartOfAccountRepository = makeChartOfAccountRepository();
    chartOfAccountRepository.findById.mockResolvedValue(null);
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateChartOfAccountUseCase(
      chartOfAccountRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        accountId: 'no-existe',
        name: 'X',
      }),
    ).rejects.toThrow(ChartOfAccountNotFoundError);
  });

  it('rechaza asignar como padre a sí misma', async () => {
    const chartOfAccountRepository = makeChartOfAccountRepository();
    chartOfAccountRepository.findById.mockResolvedValue(makeAccount({ id: 'account-1' }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateChartOfAccountUseCase(
      chartOfAccountRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        accountId: 'account-1',
        parentId: 'account-1',
      }),
    ).rejects.toThrow(AccountCycleError);
  });

  it('rechaza un ciclo indirecto (el nuevo padre desciende de esta cuenta)', async () => {
    const chartOfAccountRepository = makeChartOfAccountRepository();
    chartOfAccountRepository.findById.mockImplementation(async (id) => {
      if (id === 'account-1') return makeAccount({ id: 'account-1', parentId: null });
      if (id === 'account-3') return makeAccount({ id: 'account-3', parentId: 'account-2' });
      if (id === 'account-2') return makeAccount({ id: 'account-2', parentId: 'account-1' });
      return null;
    });
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateChartOfAccountUseCase(
      chartOfAccountRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        accountId: 'account-1',
        parentId: 'account-3',
      }),
    ).rejects.toThrow(AccountCycleError);
  });
});

describe('DeactivateChartOfAccountUseCase / ActivateChartOfAccountUseCase', () => {
  it('desactiva una cuenta activa que no es de sistema', async () => {
    const chartOfAccountRepository = makeChartOfAccountRepository();
    chartOfAccountRepository.findById.mockResolvedValue(
      makeAccount({ isActive: true, isSystemAccount: false }),
    );
    chartOfAccountRepository.setActive.mockResolvedValue(makeAccount({ isActive: false }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new DeactivateChartOfAccountUseCase(
      chartOfAccountRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      accountId: 'account-1',
    });

    expect(result.isActive).toBe(false);
  });

  it('RN-ACC-02: rechaza desactivar una cuenta de sistema', async () => {
    const chartOfAccountRepository = makeChartOfAccountRepository();
    chartOfAccountRepository.findById.mockResolvedValue(
      makeAccount({ isActive: true, isSystemAccount: true }),
    );
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new DeactivateChartOfAccountUseCase(
      chartOfAccountRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        accountId: 'account-1',
      }),
    ).rejects.toThrow(SystemAccountCannotBeDeactivatedError);
  });

  it('rechaza desactivar una cuenta ya inactiva', async () => {
    const chartOfAccountRepository = makeChartOfAccountRepository();
    chartOfAccountRepository.findById.mockResolvedValue(makeAccount({ isActive: false }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new DeactivateChartOfAccountUseCase(
      chartOfAccountRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        accountId: 'account-1',
      }),
    ).rejects.toThrow(ChartOfAccountAlreadyInTargetStateError);
  });

  it('reactiva una cuenta inactiva', async () => {
    const chartOfAccountRepository = makeChartOfAccountRepository();
    chartOfAccountRepository.findById.mockResolvedValue(makeAccount({ isActive: false }));
    chartOfAccountRepository.setActive.mockResolvedValue(makeAccount({ isActive: true }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new ActivateChartOfAccountUseCase(
      chartOfAccountRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      accountId: 'account-1',
    });

    expect(result.isActive).toBe(true);
  });
});

describe('GetChartOfAccountByIdUseCase / ListChartOfAccountsUseCase', () => {
  it('devuelve la cuenta cuando existe', async () => {
    const chartOfAccountRepository = makeChartOfAccountRepository();
    chartOfAccountRepository.findById.mockResolvedValue(makeAccount());
    const useCase = new GetChartOfAccountByIdUseCase(chartOfAccountRepository);

    const result = await useCase.execute('account-1', 'company-1');

    expect(result.id).toBe('account-1');
  });

  it('lanza ChartOfAccountNotFoundError si no existe', async () => {
    const chartOfAccountRepository = makeChartOfAccountRepository();
    chartOfAccountRepository.findById.mockResolvedValue(null);
    const useCase = new GetChartOfAccountByIdUseCase(chartOfAccountRepository);

    await expect(useCase.execute('no-existe', 'company-1')).rejects.toThrow(
      ChartOfAccountNotFoundError,
    );
  });

  it('pasa el filtro isActive al repositorio', async () => {
    const chartOfAccountRepository = makeChartOfAccountRepository();
    chartOfAccountRepository.findAllByCompany.mockResolvedValue([makeAccount()]);
    const useCase = new ListChartOfAccountsUseCase(chartOfAccountRepository);

    const result = await useCase.execute({ companyId: 'company-1', isActive: true });

    expect(result).toHaveLength(1);
    expect(chartOfAccountRepository.findAllByCompany).toHaveBeenCalledWith('company-1', {
      isActive: true,
    });
  });
});
