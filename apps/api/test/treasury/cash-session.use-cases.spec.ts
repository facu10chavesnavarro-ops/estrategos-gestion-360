import { OpenCashSessionUseCase } from '../../src/modules/treasury/application/use-cases/open-cash-session.use-case';
import { CloseCashSessionUseCase } from '../../src/modules/treasury/application/use-cases/close-cash-session.use-case';
import { CreateCashMovementUseCase } from '../../src/modules/treasury/application/use-cases/create-cash-movement.use-case';
import { ListCashSessionsUseCase } from '../../src/modules/treasury/application/use-cases/list-cash-sessions.use-case';
import { ListCashMovementsUseCase } from '../../src/modules/treasury/application/use-cases/list-cash-movements.use-case';
import { CashRegisterEntity } from '../../src/modules/treasury/domain/entities/cash-register.entity';
import { CashRegisterRepository } from '../../src/modules/treasury/domain/repositories/cash-register.repository';
import { CashSessionEntity } from '../../src/modules/treasury/domain/entities/cash-session.entity';
import { CashSessionRepository } from '../../src/modules/treasury/domain/repositories/cash-session.repository';
import { CashMovementEntity } from '../../src/modules/treasury/domain/entities/cash-movement.entity';
import { CashMovementRepository } from '../../src/modules/treasury/domain/repositories/cash-movement.repository';
import { ApplyCashMovementService } from '../../src/modules/treasury/application/services/apply-cash-movement.service';
import { AccountingSettingsRepository } from '../../src/modules/accounting/domain/repositories/accounting-settings.repository';
import { AccountingSettingsEntity } from '../../src/modules/accounting/domain/entities/accounting-settings.entity';
import { ApplyJournalEntryService } from '../../src/modules/accounting/application/services/apply-journal-entry.service';
import {
  MissingCashRegisterAccountMappingError,
  MissingCounterpartAccountError,
} from '../../src/modules/accounting/domain/errors/accounting.errors';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import {
  CashRegisterNotFoundError,
  CashRegisterAlreadyHasOpenSessionError,
  InvalidOpeningBalanceError,
  CashSessionNotFoundError,
  CashSessionAlreadyClosedError,
  MissingCashMovementReasonError,
  InvalidCashMovementAmountError,
  CashSessionNotOpenError,
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

function makeCashSession(overrides: Partial<CashSessionEntity> = {}): CashSessionEntity {
  return new CashSessionEntity(
    overrides.id ?? 'session-1',
    overrides.cashRegisterId ?? 'register-1',
    overrides.openedByUserId ?? 'user-1',
    overrides.openingBalance ?? '0.00',
    overrides.openedAt ?? new Date(),
    overrides.closedByUserId ?? null,
    overrides.closingBalance ?? null,
    overrides.expectedBalance ?? null,
    overrides.difference ?? null,
    overrides.closedAt ?? null,
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

function makeCashSessionRepository(): jest.Mocked<CashSessionRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findOpenByCashRegister: jest.fn(),
    findAllByCashRegister: jest.fn(),
    close: jest.fn(),
  } as jest.Mocked<CashSessionRepository>;
}

function makeCashMovementRepository(): jest.Mocked<CashMovementRepository> {
  return {
    create: jest.fn(),
    findAllBySession: jest.fn(),
    sumAmountBySessionAndType: jest.fn(),
  } as jest.Mocked<CashMovementRepository>;
}

describe('OpenCashSessionUseCase', () => {
  function makeSut() {
    const cashRegisterRepository = makeCashRegisterRepository();
    const cashSessionRepository = makeCashSessionRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new OpenCashSessionUseCase(
      cashRegisterRepository,
      cashSessionRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );
    cashRegisterRepository.findById.mockResolvedValue(makeCashRegister());
    cashSessionRepository.findOpenByCashRegister.mockResolvedValue(null);
    cashSessionRepository.create.mockResolvedValue(makeCashSession());
    return { cashRegisterRepository, cashSessionRepository, auditLogRepository, useCase };
  }

  it('abre la sesión cuando no hay ninguna abierta', async () => {
    const { useCase, auditLogRepository } = makeSut();

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      cashRegisterId: 'register-1',
      openingBalance: '100',
    });

    expect(result.id).toBe('session-1');
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'cash_session.open' }),
      expect.anything(),
    );
  });

  it('rechaza si el rol no autoriza', async () => {
    const { useCase } = makeSut();

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Empleado',
        companyId: 'company-1',
        cashRegisterId: 'register-1',
        openingBalance: '100',
      }),
    ).rejects.toThrow(RoleNotAuthorizedError);
  });

  it('rechaza si la caja no existe', async () => {
    const { useCase, cashRegisterRepository } = makeSut();
    cashRegisterRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        cashRegisterId: 'no-existe',
        openingBalance: '100',
      }),
    ).rejects.toThrow(CashRegisterNotFoundError);
  });

  it('RN-CASH-03: rechaza un saldo de apertura negativo', async () => {
    const { useCase } = makeSut();

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        cashRegisterId: 'register-1',
        openingBalance: '-1',
      }),
    ).rejects.toThrow(InvalidOpeningBalanceError);
  });

  it('permite un saldo de apertura exactamente en 0', async () => {
    const { useCase } = makeSut();

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        cashRegisterId: 'register-1',
        openingBalance: '0',
      }),
    ).resolves.toBeDefined();
  });

  it('RN-CASH-02: rechaza si ya hay una sesión abierta en la misma caja', async () => {
    const { useCase, cashSessionRepository } = makeSut();
    cashSessionRepository.findOpenByCashRegister.mockResolvedValue(makeCashSession());

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        cashRegisterId: 'register-1',
        openingBalance: '100',
      }),
    ).rejects.toThrow(CashRegisterAlreadyHasOpenSessionError);
  });
});

// Auditoría de seguridad (hallazgo A1, IDOR): `findAllByCashRegister` ahora
// exige companyId — el use case debe reenviar siempre el del contexto
// verificado. La exclusión real de filas de otra empresa se prueba contra
// DB real en test/security/multi-tenant-isolation.integration-spec.ts.
describe('ListCashSessionsUseCase', () => {
  it('lista las sesiones de una caja', async () => {
    const cashSessionRepository = makeCashSessionRepository();
    cashSessionRepository.findAllByCashRegister.mockResolvedValue([makeCashSession()]);
    const useCase = new ListCashSessionsUseCase(cashSessionRepository);

    const result = await useCase.execute('register-1', 'company-1');

    expect(result).toHaveLength(1);
    expect(cashSessionRepository.findAllByCashRegister).toHaveBeenCalledWith(
      'register-1',
      'company-1',
    );
  });

  it('reenvía el companyId del contexto al repositorio, nunca uno distinto', async () => {
    const cashSessionRepository = makeCashSessionRepository();
    cashSessionRepository.findAllByCashRegister.mockResolvedValue([]);
    const useCase = new ListCashSessionsUseCase(cashSessionRepository);

    await useCase.execute('register-de-otra-empresa', 'company-1');

    expect(cashSessionRepository.findAllByCashRegister).toHaveBeenCalledWith(
      'register-de-otra-empresa',
      'company-1',
    );
    expect(cashSessionRepository.findAllByCashRegister).not.toHaveBeenCalledWith(
      'register-de-otra-empresa',
      'otra-empresa',
    );
  });
});

// Auditoría de seguridad (hallazgo A1, IDOR): `findAllBySession` ahora
// exige companyId — mismo criterio que ListCashSessionsUseCase arriba.
describe('ListCashMovementsUseCase', () => {
  it('lista los movimientos de una sesión', async () => {
    const cashMovementRepository = makeCashMovementRepository();
    cashMovementRepository.findAllBySession.mockResolvedValue([]);
    const useCase = new ListCashMovementsUseCase(cashMovementRepository);

    await useCase.execute('session-1', 'company-1');

    expect(cashMovementRepository.findAllBySession).toHaveBeenCalledWith(
      'session-1',
      'company-1',
    );
  });

  it('reenvía el companyId del contexto al repositorio, nunca uno distinto', async () => {
    const cashMovementRepository = makeCashMovementRepository();
    cashMovementRepository.findAllBySession.mockResolvedValue([]);
    const useCase = new ListCashMovementsUseCase(cashMovementRepository);

    await useCase.execute('session-de-otra-empresa', 'company-1');

    expect(cashMovementRepository.findAllBySession).toHaveBeenCalledWith(
      'session-de-otra-empresa',
      'company-1',
    );
    expect(cashMovementRepository.findAllBySession).not.toHaveBeenCalledWith(
      'session-de-otra-empresa',
      'otra-empresa',
    );
  });
});

describe('CloseCashSessionUseCase', () => {
  function makeSut() {
    const cashSessionRepository = makeCashSessionRepository();
    const cashMovementRepository = makeCashMovementRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CloseCashSessionUseCase(
      cashSessionRepository,
      cashMovementRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );
    cashSessionRepository.findById.mockResolvedValue(
      makeCashSession({ openingBalance: '100.00' }),
    );
    cashMovementRepository.sumAmountBySessionAndType.mockImplementation(async (_id, type) =>
      type === 'IN' ? '500.00' : '200.00',
    );
    cashSessionRepository.close.mockImplementation(async (id, input) =>
      makeCashSession({
        id,
        closedByUserId: input.closedByUserId,
        closingBalance: input.closingBalance,
        expectedBalance: input.expectedBalance,
        difference: input.difference,
        closedAt: new Date(),
      }),
    );
    return { cashSessionRepository, cashMovementRepository, auditLogRepository, useCase };
  }

  it('RN-CASH-04: calcula expectedBalance y difference correctamente', async () => {
    const { useCase } = makeSut();

    // openingBalance 100 + IN 500 - OUT 200 = 400 esperado.
    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      cashSessionId: 'session-1',
      closingBalance: '390',
    });

    expect(result.expectedBalance).toBe('400.00');
    expect(result.difference).toBe('-10.00'); // 390 - 400
    expect(result.closingBalance).toBe('390.00');
  });

  it('rechaza si la sesión no existe', async () => {
    const { useCase, cashSessionRepository } = makeSut();
    cashSessionRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        cashSessionId: 'no-existe',
        closingBalance: '100',
      }),
    ).rejects.toThrow(CashSessionNotFoundError);
  });

  it('rechaza si la sesión ya está cerrada', async () => {
    const { useCase, cashSessionRepository } = makeSut();
    cashSessionRepository.findById.mockResolvedValue(
      makeCashSession({ closedAt: new Date() }),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        cashSessionId: 'session-1',
        closingBalance: '100',
      }),
    ).rejects.toThrow(CashSessionAlreadyClosedError);
  });
});

describe('CreateCashMovementUseCase (manual)', () => {
  function makeSut() {
    const cashSessionRepository = makeCashSessionRepository();
    const cashRegisterRepository = makeCashRegisterRepository();
    const applyCashMovementService = {
      apply: jest.fn(),
    } as unknown as jest.Mocked<ApplyCashMovementService>;
    const accountingSettingsRepository = {
      create: jest.fn(),
      findByCompany: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<AccountingSettingsRepository>;
    const applyJournalEntryService = {
      apply: jest.fn(),
    } as unknown as jest.Mocked<ApplyJournalEntryService>;
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateCashMovementUseCase(
      cashSessionRepository,
      cashRegisterRepository,
      applyCashMovementService,
      accountingSettingsRepository,
      applyJournalEntryService,
      auditLogRepository,
      createFakeUnitOfWork(),
    );
    cashSessionRepository.findById.mockResolvedValue(makeCashSession());
    applyCashMovementService.apply.mockResolvedValue({} as CashMovementEntity);
    return {
      cashSessionRepository,
      cashRegisterRepository,
      applyCashMovementService,
      accountingSettingsRepository,
      applyJournalEntryService,
      auditLogRepository,
      useCase,
    };
  }

  it('crea un movimiento manual con motivo', async () => {
    const { useCase, applyCashMovementService } = makeSut();

    await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      cashSessionId: 'session-1',
      type: 'IN',
      amount: '50',
      reason: 'Aporte del dueño',
    });

    expect(applyCashMovementService.apply).toHaveBeenCalledWith(
      expect.objectContaining({ cashSessionId: 'session-1', type: 'IN', amount: '50.00' }),
      expect.anything(),
    );
  });

  it('RN-CASH-05: rechaza sin motivo', async () => {
    const { useCase } = makeSut();

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        cashSessionId: 'session-1',
        type: 'IN',
        amount: '50',
      }),
    ).rejects.toThrow(MissingCashMovementReasonError);
  });

  it('rechaza un monto cero', async () => {
    const { useCase } = makeSut();

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        cashSessionId: 'session-1',
        type: 'IN',
        amount: '0',
        reason: 'Motivo',
      }),
    ).rejects.toThrow(InvalidCashMovementAmountError);
  });

  it('RN-CASH-06: rechaza si la sesión no está abierta', async () => {
    const { useCase, cashSessionRepository } = makeSut();
    cashSessionRepository.findById.mockResolvedValue(
      makeCashSession({ closedAt: new Date() }),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        cashSessionId: 'session-1',
        type: 'OUT',
        amount: '50',
        reason: 'Motivo',
      }),
    ).rejects.toThrow(CashSessionNotOpenError);
  });

  describe('Sprint 4: asiento contable de movimientos manuales (RN-ACC-06)', () => {
    it('no exige counterpartAccountId si la empresa no activó Contabilidad', async () => {
      const { useCase } = makeSut();

      await expect(
        useCase.execute({
          requestingUserId: 'user-1',
          requestingRoleName: 'Propietario',
          companyId: 'company-1',
          cashSessionId: 'session-1',
          type: 'IN',
          amount: '50',
          reason: 'Aporte del dueño',
        }),
      ).resolves.toBeDefined();
    });

    it('rechaza sin counterpartAccountId cuando Contabilidad está activa', async () => {
      const { useCase, accountingSettingsRepository } = makeSut();
      accountingSettingsRepository.findByCompany.mockResolvedValue(
        new AccountingSettingsEntity('company-1', 'ar-account', 'ap-account'),
      );

      await expect(
        useCase.execute({
          requestingUserId: 'user-1',
          requestingRoleName: 'Propietario',
          companyId: 'company-1',
          cashSessionId: 'session-1',
          type: 'IN',
          amount: '50',
          reason: 'Aporte del dueño',
        }),
      ).rejects.toThrow(MissingCounterpartAccountError);
    });

    it('rechaza si la caja no tiene cuenta contable mapeada', async () => {
      const { useCase, accountingSettingsRepository, cashRegisterRepository } = makeSut();
      accountingSettingsRepository.findByCompany.mockResolvedValue(
        new AccountingSettingsEntity('company-1', 'ar-account', 'ap-account'),
      );
      cashRegisterRepository.findById.mockResolvedValue(
        makeCashRegister({ accountId: null }),
      );

      await expect(
        useCase.execute({
          requestingUserId: 'user-1',
          requestingRoleName: 'Propietario',
          companyId: 'company-1',
          cashSessionId: 'session-1',
          type: 'IN',
          amount: '50',
          reason: 'Aporte del dueño',
          counterpartAccountId: 'capital-account',
        }),
      ).rejects.toThrow(MissingCashRegisterAccountMappingError);
    });

    it('genera un asiento balanceado contra la cuenta de la caja', async () => {
      const {
        useCase,
        accountingSettingsRepository,
        cashRegisterRepository,
        applyJournalEntryService,
      } = makeSut();
      accountingSettingsRepository.findByCompany.mockResolvedValue(
        new AccountingSettingsEntity('company-1', 'ar-account', 'ap-account'),
      );
      cashRegisterRepository.findById.mockResolvedValue(
        makeCashRegister({ accountId: 'caja-account' }),
      );

      await useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        cashSessionId: 'session-1',
        type: 'IN',
        amount: '50',
        reason: 'Aporte del dueño',
        counterpartAccountId: 'capital-account',
      });

      expect(applyJournalEntryService.apply).toHaveBeenCalledWith(
        expect.objectContaining({
          origin: 'MANUAL',
          lines: [
            expect.objectContaining({ accountId: 'caja-account', debit: '50.00', credit: '0' }),
            expect.objectContaining({ accountId: 'capital-account', debit: '0', credit: '50.00' }),
          ],
        }),
        expect.anything(),
      );
    });
  });
});
