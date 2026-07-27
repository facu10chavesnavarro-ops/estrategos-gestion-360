import { CreateTaxUseCase } from '../../src/modules/catalog/application/use-cases/create-tax.use-case';
import { UpdateTaxUseCase } from '../../src/modules/catalog/application/use-cases/update-tax.use-case';
import { CloseTaxUseCase } from '../../src/modules/catalog/application/use-cases/close-tax.use-case';
import { ListTaxesUseCase } from '../../src/modules/catalog/application/use-cases/list-taxes.use-case';
import { TaxEntity } from '../../src/modules/catalog/domain/entities/tax.entity';
import { TaxRepository } from '../../src/modules/catalog/domain/repositories/tax.repository';
import { ChartOfAccountRepository } from '../../src/modules/accounting/domain/repositories/chart-of-account.repository';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import {
  TaxNotFoundError,
  InvalidTaxRateError,
  InvalidTaxValidityError,
  TaxAlreadyClosedError,
} from '../../src/modules/catalog/domain/errors/tax.errors';
import { createFakeUnitOfWork, FAKE_TRANSACTION_CONTEXT } from '../support/fake-unit-of-work';

function makeTax(overrides: Partial<TaxEntity> = {}): TaxEntity {
  return new TaxEntity(
    overrides.id ?? 'tax-1',
    overrides.companyId ?? 'company-1',
    overrides.name ?? 'IVA 21%',
    overrides.type ?? 'VAT',
    overrides.rate ?? '21',
    overrides.validFrom ?? new Date('2026-01-01'),
    overrides.validTo ?? null,
    overrides.salesAccountId ?? null,
    overrides.purchasesAccountId ?? null,
  );
}

function makeTaxRepository(): jest.Mocked<TaxRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByCompany: jest.fn(),
    updateName: jest.fn(),
    updateAccounts: jest.fn(),
    close: jest.fn(),
  } as jest.Mocked<TaxRepository>;
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

describe('CreateTaxUseCase', () => {
  it('crea el impuesto cuando el rol autoriza', async () => {
    const taxRepository = makeTaxRepository();
    taxRepository.create.mockResolvedValue(makeTax());
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateTaxUseCase(
      taxRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      name: 'IVA 21%',
      type: 'VAT',
      rate: '21',
    });

    expect(result.rate).toBe('21');
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tax.create' }),
      FAKE_TRANSACTION_CONTEXT,
    );
  });

  it('rechaza si el rol no autoriza', async () => {
    const taxRepository = makeTaxRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateTaxUseCase(
      taxRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Empleado',
        companyId: 'company-1',
        name: 'IVA 21%',
        type: 'VAT',
        rate: '21',
      }),
    ).rejects.toThrow(RoleNotAuthorizedError);
  });

  it('RN-CAT-09: rechaza una tasa negativa', async () => {
    const taxRepository = makeTaxRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateTaxUseCase(
      taxRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        name: 'X',
        type: 'VAT',
        rate: '-5',
      }),
    ).rejects.toThrow(InvalidTaxRateError);
  });

  it('RN-CAT-10: rechaza validTo anterior o igual a validFrom', async () => {
    const taxRepository = makeTaxRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateTaxUseCase(
      taxRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        name: 'X',
        type: 'VAT',
        rate: '21',
        validFrom: '2026-06-01T00:00:00.000Z',
        validTo: '2026-01-01T00:00:00.000Z',
      }),
    ).rejects.toThrow(InvalidTaxValidityError);
  });
});

describe('UpdateTaxUseCase', () => {
  it('actualiza solo el nombre', async () => {
    const taxRepository = makeTaxRepository();
    taxRepository.findById.mockResolvedValue(makeTax());
    taxRepository.updateName.mockResolvedValue(makeTax({ name: 'IVA General' }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateTaxUseCase(
      taxRepository,
      makeChartOfAccountRepository(),
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      taxId: 'tax-1',
      name: 'IVA General',
    });

    expect(result.name).toBe('IVA General');
  });

  it('rechaza si el impuesto no existe', async () => {
    const taxRepository = makeTaxRepository();
    taxRepository.findById.mockResolvedValue(null);
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateTaxUseCase(
      taxRepository,
      makeChartOfAccountRepository(),
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        taxId: 'no-existe',
        name: 'X',
      }),
    ).rejects.toThrow(TaxNotFoundError);
  });
});

describe('CloseTaxUseCase', () => {
  it('cierra la vigencia de un impuesto vigente', async () => {
    const taxRepository = makeTaxRepository();
    taxRepository.findById.mockResolvedValue(makeTax({ validTo: null }));
    taxRepository.close.mockResolvedValue(makeTax({ validTo: new Date() }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CloseTaxUseCase(
      taxRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      taxId: 'tax-1',
    });

    expect(result.validTo).not.toBeNull();
  });

  it('rechaza cerrar un impuesto ya cerrado', async () => {
    const taxRepository = makeTaxRepository();
    taxRepository.findById.mockResolvedValue(
      makeTax({ validTo: new Date('2020-01-01') }),
    );
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CloseTaxUseCase(
      taxRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        taxId: 'tax-1',
      }),
    ).rejects.toThrow(TaxAlreadyClosedError);
  });
});

describe('ListTaxesUseCase', () => {
  it('pasa el filtro onlyCurrentlyValid al repositorio', async () => {
    const taxRepository = makeTaxRepository();
    taxRepository.findAllByCompany.mockResolvedValue([makeTax()]);
    const useCase = new ListTaxesUseCase(taxRepository);

    const result = await useCase.execute({ companyId: 'company-1', onlyCurrentlyValid: true });

    expect(result).toHaveLength(1);
    expect(taxRepository.findAllByCompany).toHaveBeenCalledWith('company-1', {
      onlyCurrentlyValid: true,
    });
  });
});
