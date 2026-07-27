import { ActivateAccountingUseCase } from '../../src/modules/accounting/application/use-cases/activate-accounting.use-case';
import { GetAccountingSettingsUseCase } from '../../src/modules/accounting/application/use-cases/get-accounting-settings.use-case';
import { UpdateAccountingSettingsUseCase } from '../../src/modules/accounting/application/use-cases/update-accounting-settings.use-case';
import { SetPaymentMethodAccountMappingUseCase } from '../../src/modules/accounting/application/use-cases/set-payment-method-account-mapping.use-case';
import { ChartOfAccountRepository } from '../../src/modules/accounting/domain/repositories/chart-of-account.repository';
import { AccountingSettingsRepository } from '../../src/modules/accounting/domain/repositories/accounting-settings.repository';
import { CompanyPaymentMethodAccountRepository } from '../../src/modules/accounting/domain/repositories/company-payment-method-account.repository';
import { PaymentMethodRepository } from '../../src/modules/treasury/domain/repositories/payment-method.repository';
import { PaymentMethodEntity } from '../../src/modules/treasury/domain/entities/payment-method.entity';
import { ChartOfAccountEntity } from '../../src/modules/accounting/domain/entities/chart-of-account.entity';
import { AccountingSettingsEntity } from '../../src/modules/accounting/domain/entities/accounting-settings.entity';
import { CompanyPaymentMethodAccountEntity } from '../../src/modules/accounting/domain/entities/company-payment-method-account.entity';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import {
  AccountingAlreadyActivatedError,
  AccountingSettingsNotFoundError,
  InvalidAccountMappingError,
} from '../../src/modules/accounting/domain/errors/accounting.errors';
import { InvalidPaymentMethodError } from '../../src/modules/treasury/domain/errors/payment.errors';
import {
  CHART_OF_ACCOUNTS_TEMPLATE,
  CHART_OF_ACCOUNTS_TEMPLATE_KEYS,
} from '../../src/modules/accounting/application/chart-of-accounts-template';
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

function makeAccountingSettingsRepository(): jest.Mocked<AccountingSettingsRepository> {
  return {
    create: jest.fn(),
    findByCompany: jest.fn(),
    update: jest.fn(),
  } as jest.Mocked<AccountingSettingsRepository>;
}

describe('ActivateAccountingUseCase', () => {
  function makeSut() {
    const chartOfAccountRepository = makeChartOfAccountRepository();
    const accountingSettingsRepository = makeAccountingSettingsRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    chartOfAccountRepository.create.mockImplementation(async (input) =>
      makeAccount({ id: `acc-${input.code}`, code: input.code, companyId: input.companyId }),
    );
    accountingSettingsRepository.create.mockImplementation(async (input) =>
      new AccountingSettingsEntity(
        input.companyId,
        input.accountsReceivableId,
        input.accountsPayableId,
      ),
    );
    const useCase = new ActivateAccountingUseCase(
      chartOfAccountRepository,
      accountingSettingsRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );
    return { chartOfAccountRepository, accountingSettingsRepository, auditLogRepository, useCase };
  }

  it('clona la plantilla y crea AccountingSettings con las cuentas AR/AP correctas', async () => {
    const { useCase, chartOfAccountRepository, accountingSettingsRepository } = makeSut();
    accountingSettingsRepository.findByCompany.mockResolvedValue(null);

    const settings = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
    });

    expect(chartOfAccountRepository.create).toHaveBeenCalled();
    expect(settings.accountsReceivableId).toBe(
      `acc-${findCodeForKey(CHART_OF_ACCOUNTS_TEMPLATE_KEYS.ACCOUNTS_RECEIVABLE)}`,
    );
    expect(settings.accountsPayableId).toBe(
      `acc-${findCodeForKey(CHART_OF_ACCOUNTS_TEMPLATE_KEYS.ACCOUNTS_PAYABLE)}`,
    );
  });

  it('rechaza si el rol no autoriza', async () => {
    const { useCase, accountingSettingsRepository } = makeSut();
    accountingSettingsRepository.findByCompany.mockResolvedValue(null);

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Empleado',
        companyId: 'company-1',
      }),
    ).rejects.toThrow(RoleNotAuthorizedError);
  });

  it('rechaza si la empresa ya activó Contabilidad', async () => {
    const { useCase, accountingSettingsRepository } = makeSut();
    accountingSettingsRepository.findByCompany.mockResolvedValue(
      new AccountingSettingsEntity('company-1', 'ar-1', 'ap-1'),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
      }),
    ).rejects.toThrow(AccountingAlreadyActivatedError);
  });
});

function findCodeForKey(key: string): string {
  const item = CHART_OF_ACCOUNTS_TEMPLATE.find((i) => i.key === key);
  return item!.code;
}

describe('GetAccountingSettingsUseCase', () => {
  it('devuelve la configuración cuando existe', async () => {
    const accountingSettingsRepository = makeAccountingSettingsRepository();
    accountingSettingsRepository.findByCompany.mockResolvedValue(
      new AccountingSettingsEntity('company-1', 'ar-1', 'ap-1'),
    );
    const useCase = new GetAccountingSettingsUseCase(accountingSettingsRepository);

    const result = await useCase.execute('company-1');

    expect(result.accountsReceivableId).toBe('ar-1');
  });

  it('lanza AccountingSettingsNotFoundError si no se activó', async () => {
    const accountingSettingsRepository = makeAccountingSettingsRepository();
    accountingSettingsRepository.findByCompany.mockResolvedValue(null);
    const useCase = new GetAccountingSettingsUseCase(accountingSettingsRepository);

    await expect(useCase.execute('company-1')).rejects.toThrow(AccountingSettingsNotFoundError);
  });
});

describe('UpdateAccountingSettingsUseCase', () => {
  function makeSut() {
    const accountingSettingsRepository = makeAccountingSettingsRepository();
    const chartOfAccountRepository = makeChartOfAccountRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    accountingSettingsRepository.findByCompany.mockResolvedValue(
      new AccountingSettingsEntity('company-1', 'ar-1', 'ap-1'),
    );
    accountingSettingsRepository.update.mockImplementation(async (companyId, input) =>
      new AccountingSettingsEntity(
        companyId,
        input.accountsReceivableId ?? 'ar-1',
        input.accountsPayableId ?? 'ap-1',
      ),
    );
    chartOfAccountRepository.findById.mockResolvedValue(makeAccount({ id: 'ar-2' }));
    const useCase = new UpdateAccountingSettingsUseCase(
      accountingSettingsRepository,
      chartOfAccountRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );
    return { accountingSettingsRepository, chartOfAccountRepository, auditLogRepository, useCase };
  }

  it('actualiza la cuenta de Deudores por Ventas', async () => {
    const { useCase } = makeSut();

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      accountsReceivableId: 'ar-2',
    });

    expect(result.accountsReceivableId).toBe('ar-2');
  });

  it('rechaza una cuenta no imputable o de otra empresa', async () => {
    const { useCase, chartOfAccountRepository } = makeSut();
    chartOfAccountRepository.findById.mockResolvedValue(
      makeAccount({ id: 'ar-2', allowsMovements: false }),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        accountsReceivableId: 'ar-2',
      }),
    ).rejects.toThrow(InvalidAccountMappingError);
  });

  it('rechaza si Contabilidad no está activada', async () => {
    const { useCase, accountingSettingsRepository } = makeSut();
    accountingSettingsRepository.findByCompany.mockResolvedValue(null);

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        accountsReceivableId: 'ar-2',
      }),
    ).rejects.toThrow(AccountingSettingsNotFoundError);
  });
});

describe('SetPaymentMethodAccountMappingUseCase', () => {
  function makeSut() {
    const companyPaymentMethodAccountRepository = {
      upsert: jest.fn(),
      find: jest.fn(),
      findAllByCompany: jest.fn(),
    } as jest.Mocked<CompanyPaymentMethodAccountRepository>;
    const chartOfAccountRepository = makeChartOfAccountRepository();
    const paymentMethodRepository = {
      findById: jest.fn(),
      findAllActive: jest.fn(),
    } as jest.Mocked<PaymentMethodRepository>;
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    paymentMethodRepository.findById.mockResolvedValue(
      new PaymentMethodEntity('method-cheque', 'CHEQUE', 'Cheque', true, false, false, false, true),
    );
    chartOfAccountRepository.findById.mockResolvedValue(makeAccount());
    companyPaymentMethodAccountRepository.upsert.mockImplementation(
      async (input) =>
        new CompanyPaymentMethodAccountEntity(
          input.companyId,
          input.paymentMethodId,
          input.direction,
          input.accountId,
        ),
    );
    const useCase = new SetPaymentMethodAccountMappingUseCase(
      companyPaymentMethodAccountRepository,
      chartOfAccountRepository,
      paymentMethodRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );
    return {
      companyPaymentMethodAccountRepository,
      chartOfAccountRepository,
      paymentMethodRepository,
      auditLogRepository,
      useCase,
    };
  }

  it('mapea CHEQUE + COLLECTION a una cuenta', async () => {
    const { useCase, companyPaymentMethodAccountRepository } = makeSut();

    await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      paymentMethodId: 'method-cheque',
      direction: 'COLLECTION',
      accountId: 'account-1',
    });

    expect(companyPaymentMethodAccountRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        paymentMethodId: 'method-cheque',
        direction: 'COLLECTION',
        accountId: 'account-1',
      }),
      expect.anything(),
    );
  });

  it('rechaza un método de pago inexistente', async () => {
    const { useCase, paymentMethodRepository } = makeSut();
    paymentMethodRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        paymentMethodId: 'no-existe',
        direction: 'COLLECTION',
        accountId: 'account-1',
      }),
    ).rejects.toThrow(InvalidPaymentMethodError);
  });

  it('rechaza una cuenta no imputable', async () => {
    const { useCase, chartOfAccountRepository } = makeSut();
    chartOfAccountRepository.findById.mockResolvedValue(
      makeAccount({ allowsMovements: false }),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        paymentMethodId: 'method-cheque',
        direction: 'COLLECTION',
        accountId: 'account-1',
      }),
    ).rejects.toThrow(InvalidAccountMappingError);
  });
});
