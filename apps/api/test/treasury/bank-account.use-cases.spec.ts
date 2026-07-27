import { CreateBankAccountUseCase } from '../../src/modules/treasury/application/use-cases/create-bank-account.use-case';
import { UpdateBankAccountUseCase } from '../../src/modules/treasury/application/use-cases/update-bank-account.use-case';
import { DeactivateBankAccountUseCase } from '../../src/modules/treasury/application/use-cases/deactivate-bank-account.use-case';
import { ActivateBankAccountUseCase } from '../../src/modules/treasury/application/use-cases/activate-bank-account.use-case';
import { CreateBankMovementUseCase } from '../../src/modules/treasury/application/use-cases/create-bank-movement.use-case';
import { BankAccountEntity } from '../../src/modules/treasury/domain/entities/bank-account.entity';
import { BankAccountRepository } from '../../src/modules/treasury/domain/repositories/bank-account.repository';
import { BankMovementEntity } from '../../src/modules/treasury/domain/entities/bank-movement.entity';
import { ApplyBankMovementService } from '../../src/modules/treasury/application/services/apply-bank-movement.service';
import { ChartOfAccountRepository } from '../../src/modules/accounting/domain/repositories/chart-of-account.repository';
import { AccountingSettingsRepository } from '../../src/modules/accounting/domain/repositories/accounting-settings.repository';
import { AccountingSettingsEntity } from '../../src/modules/accounting/domain/entities/accounting-settings.entity';
import { ApplyJournalEntryService } from '../../src/modules/accounting/application/services/apply-journal-entry.service';
import {
  MissingBankAccountMappingError,
  MissingCounterpartAccountError,
} from '../../src/modules/accounting/domain/errors/accounting.errors';
import { CompanyRepository } from '../../src/modules/companies/domain/repositories/company.repository';
import { CompanyEntity } from '../../src/modules/companies/domain/entities/company.entity';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import {
  BankAccountNotFoundError,
  BankAccountAlreadyInTargetStateError,
  MissingBankMovementDescriptionError,
  InvalidBankMovementAmountError,
} from '../../src/modules/treasury/domain/errors/bank.errors';
import { createFakeUnitOfWork } from '../support/fake-unit-of-work';

function makeBankAccount(overrides: Partial<BankAccountEntity> = {}): BankAccountEntity {
  return new BankAccountEntity(
    overrides.id ?? 'bank-account-1',
    overrides.companyId ?? 'company-1',
    overrides.bankName ?? 'Banco Nación',
    overrides.accountType ?? 'CHECKING',
    overrides.accountNumber ?? null,
    overrides.cbu ?? null,
    overrides.alias ?? null,
    overrides.currency ?? 'ARS',
    overrides.isActive ?? true,
    overrides.glAccountId ?? null,
  );
}

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

function makeBankAccountRepository(): jest.Mocked<BankAccountRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByCompany: jest.fn(),
    update: jest.fn(),
    setActive: jest.fn(),
  } as jest.Mocked<BankAccountRepository>;
}

function makeCompanyRepository(): jest.Mocked<CompanyRepository> {
  return {
    create: jest.fn(),
    findAllForUser: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    setActive: jest.fn(),
  } as jest.Mocked<CompanyRepository>;
}

describe('CreateBankAccountUseCase', () => {
  it('crea la cuenta bancaria, usando la moneda de la empresa por defecto', async () => {
    const bankAccountRepository = makeBankAccountRepository();
    const companyRepository = makeCompanyRepository();
    companyRepository.findById.mockResolvedValue(makeCompany({ currency: 'ARS' }));
    bankAccountRepository.create.mockResolvedValue(makeBankAccount());
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateBankAccountUseCase(
      bankAccountRepository,
      companyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      bankName: 'Banco Nación',
      accountType: 'CHECKING',
    });

    expect(result.bankName).toBe('Banco Nación');
    expect(bankAccountRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'ARS' }),
      expect.anything(),
    );
  });

  it('rechaza si el rol no autoriza', async () => {
    const bankAccountRepository = makeBankAccountRepository();
    const companyRepository = makeCompanyRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateBankAccountUseCase(
      bankAccountRepository,
      companyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Empleado',
        companyId: 'company-1',
        bankName: 'Banco Nación',
        accountType: 'CHECKING',
      }),
    ).rejects.toThrow(RoleNotAuthorizedError);
  });
});

describe('UpdateBankAccountUseCase', () => {
  it('actualiza el alias', async () => {
    const bankAccountRepository = makeBankAccountRepository();
    bankAccountRepository.findById.mockResolvedValue(makeBankAccount());
    bankAccountRepository.update.mockResolvedValue(makeBankAccount({ alias: 'cuenta.principal' }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateBankAccountUseCase(
      bankAccountRepository,
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
      bankAccountId: 'bank-account-1',
      alias: 'cuenta.principal',
    });

    expect(result.alias).toBe('cuenta.principal');
  });

  it('rechaza si la cuenta no existe', async () => {
    const bankAccountRepository = makeBankAccountRepository();
    bankAccountRepository.findById.mockResolvedValue(null);
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateBankAccountUseCase(
      bankAccountRepository,
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
        bankAccountId: 'no-existe',
      }),
    ).rejects.toThrow(BankAccountNotFoundError);
  });
});

describe('DeactivateBankAccountUseCase / ActivateBankAccountUseCase', () => {
  it('desactiva una cuenta activa', async () => {
    const bankAccountRepository = makeBankAccountRepository();
    bankAccountRepository.findById.mockResolvedValue(makeBankAccount({ isActive: true }));
    bankAccountRepository.setActive.mockResolvedValue(makeBankAccount({ isActive: false }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new DeactivateBankAccountUseCase(
      bankAccountRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      bankAccountId: 'bank-account-1',
    });

    expect(result.isActive).toBe(false);
  });

  it('rechaza desactivar una cuenta ya inactiva', async () => {
    const bankAccountRepository = makeBankAccountRepository();
    bankAccountRepository.findById.mockResolvedValue(makeBankAccount({ isActive: false }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new DeactivateBankAccountUseCase(
      bankAccountRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        bankAccountId: 'bank-account-1',
      }),
    ).rejects.toThrow(BankAccountAlreadyInTargetStateError);
  });

  it('reactiva una cuenta inactiva', async () => {
    const bankAccountRepository = makeBankAccountRepository();
    bankAccountRepository.findById.mockResolvedValue(makeBankAccount({ isActive: false }));
    bankAccountRepository.setActive.mockResolvedValue(makeBankAccount({ isActive: true }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new ActivateBankAccountUseCase(
      bankAccountRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      bankAccountId: 'bank-account-1',
    });

    expect(result.isActive).toBe(true);
  });
});

describe('CreateBankMovementUseCase (manual)', () => {
  function makeSut() {
    const bankAccountRepository = makeBankAccountRepository();
    const applyBankMovementService = {
      apply: jest.fn(),
    } as unknown as jest.Mocked<ApplyBankMovementService>;
    const accountingSettingsRepository = {
      create: jest.fn(),
      findByCompany: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<AccountingSettingsRepository>;
    const applyJournalEntryService = {
      apply: jest.fn(),
    } as unknown as jest.Mocked<ApplyJournalEntryService>;
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateBankMovementUseCase(
      bankAccountRepository,
      applyBankMovementService,
      accountingSettingsRepository,
      applyJournalEntryService,
      auditLogRepository,
      createFakeUnitOfWork(),
    );
    bankAccountRepository.findById.mockResolvedValue(makeBankAccount());
    applyBankMovementService.apply.mockResolvedValue({} as BankMovementEntity);
    return {
      bankAccountRepository,
      applyBankMovementService,
      accountingSettingsRepository,
      applyJournalEntryService,
      auditLogRepository,
      useCase,
    };
  }

  it('crea un movimiento manual con descripción', async () => {
    const { useCase, applyBankMovementService } = makeSut();

    await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      bankAccountId: 'bank-account-1',
      type: 'WITHDRAWAL',
      amount: '150',
      description: 'Gastos de mantenimiento',
    });

    expect(applyBankMovementService.apply).toHaveBeenCalledWith(
      expect.objectContaining({
        bankAccountId: 'bank-account-1',
        type: 'WITHDRAWAL',
        amount: '150.00',
      }),
      expect.anything(),
    );
  });

  it('RN-BANK-03: rechaza sin descripción', async () => {
    const { useCase } = makeSut();

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        bankAccountId: 'bank-account-1',
        type: 'DEPOSIT',
        amount: '150',
      }),
    ).rejects.toThrow(MissingBankMovementDescriptionError);
  });

  it('rechaza un monto cero', async () => {
    const { useCase } = makeSut();

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        bankAccountId: 'bank-account-1',
        type: 'DEPOSIT',
        amount: '0',
        description: 'Motivo',
      }),
    ).rejects.toThrow(InvalidBankMovementAmountError);
  });

  it('rechaza si la cuenta bancaria no existe', async () => {
    const { useCase, bankAccountRepository } = makeSut();
    bankAccountRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        bankAccountId: 'no-existe',
        type: 'DEPOSIT',
        amount: '150',
        description: 'Motivo',
      }),
    ).rejects.toThrow(BankAccountNotFoundError);
  });

  describe('Sprint 4: asiento contable de movimientos manuales (RN-ACC-06)', () => {
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
          bankAccountId: 'bank-account-1',
          type: 'DEPOSIT',
          amount: '150',
          description: 'Motivo',
        }),
      ).rejects.toThrow(MissingCounterpartAccountError);
    });

    it('rechaza si la cuenta bancaria no tiene cuenta contable mapeada', async () => {
      const { useCase, accountingSettingsRepository, bankAccountRepository } = makeSut();
      accountingSettingsRepository.findByCompany.mockResolvedValue(
        new AccountingSettingsEntity('company-1', 'ar-account', 'ap-account'),
      );
      bankAccountRepository.findById.mockResolvedValue(makeBankAccount({ glAccountId: null }));

      await expect(
        useCase.execute({
          requestingUserId: 'user-1',
          requestingRoleName: 'Propietario',
          companyId: 'company-1',
          bankAccountId: 'bank-account-1',
          type: 'DEPOSIT',
          amount: '150',
          description: 'Motivo',
          counterpartAccountId: 'ingresos-account',
        }),
      ).rejects.toThrow(MissingBankAccountMappingError);
    });

    it('genera un asiento balanceado contra la cuenta de la cuenta bancaria', async () => {
      const {
        useCase,
        accountingSettingsRepository,
        bankAccountRepository,
        applyJournalEntryService,
      } = makeSut();
      accountingSettingsRepository.findByCompany.mockResolvedValue(
        new AccountingSettingsEntity('company-1', 'ar-account', 'ap-account'),
      );
      bankAccountRepository.findById.mockResolvedValue(
        makeBankAccount({ glAccountId: 'banco-account' }),
      );

      await useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        bankAccountId: 'bank-account-1',
        type: 'DEPOSIT',
        amount: '150',
        description: 'Motivo',
        counterpartAccountId: 'ingresos-account',
      });

      expect(applyJournalEntryService.apply).toHaveBeenCalledWith(
        expect.objectContaining({
          origin: 'MANUAL',
          lines: [
            expect.objectContaining({ accountId: 'banco-account', debit: '150.00', credit: '0' }),
            expect.objectContaining({ accountId: 'ingresos-account', debit: '0', credit: '150.00' }),
          ],
        }),
        expect.anything(),
      );
    });
  });
});
