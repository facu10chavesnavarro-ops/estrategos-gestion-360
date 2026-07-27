import { ApplyJournalEntryService } from '../../src/modules/accounting/application/services/apply-journal-entry.service';
import { CreateManualJournalEntryUseCase } from '../../src/modules/accounting/application/use-cases/create-manual-journal-entry.use-case';
import { ReverseJournalEntryUseCase } from '../../src/modules/accounting/application/use-cases/reverse-journal-entry.use-case';
import { GetJournalEntryByIdUseCase } from '../../src/modules/accounting/application/use-cases/get-journal-entry-by-id.use-case';
import { ListJournalEntriesUseCase } from '../../src/modules/accounting/application/use-cases/list-journal-entries.use-case';
import { GetAccountLedgerUseCase } from '../../src/modules/accounting/application/use-cases/get-account-ledger.use-case';
import { ChartOfAccountRepository } from '../../src/modules/accounting/domain/repositories/chart-of-account.repository';
import { JournalEntryRepository } from '../../src/modules/accounting/domain/repositories/journal-entry.repository';
import { ChartOfAccountEntity } from '../../src/modules/accounting/domain/entities/chart-of-account.entity';
import { JournalEntryEntity } from '../../src/modules/accounting/domain/entities/journal-entry.entity';
import { JournalEntryLineEntity } from '../../src/modules/accounting/domain/entities/journal-entry-line.entity';
import { CompanyRepository } from '../../src/modules/companies/domain/repositories/company.repository';
import { CompanyEntity } from '../../src/modules/companies/domain/entities/company.entity';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import {
  EmptyJournalEntryLinesError,
  UnbalancedJournalEntryError,
  InvalidJournalEntryAccountError,
  JournalEntryNotFoundError,
  JournalEntryAlreadyReversedError,
  ChartOfAccountNotFoundError,
} from '../../src/modules/accounting/domain/errors/accounting.errors';
import { createFakeUnitOfWork, FAKE_TRANSACTION_CONTEXT } from '../support/fake-unit-of-work';

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

function makeJournalEntry(overrides: Partial<JournalEntryEntity> = {}): JournalEntryEntity {
  return new JournalEntryEntity(
    overrides.id ?? 'entry-1',
    overrides.companyId ?? 'company-1',
    overrides.date ?? new Date('2026-07-01'),
    overrides.description ?? 'Asiento de prueba',
    overrides.currency ?? 'ARS',
    overrides.exchangeRate ?? '1',
    overrides.origin ?? 'MANUAL',
    overrides.sourceType ?? null,
    overrides.sourceId ?? null,
    overrides.reversalOfEntryId ?? null,
    overrides.createdByUserId ?? 'user-1',
    overrides.createdAt ?? new Date('2026-07-01'),
    overrides.lines ?? [
      new JournalEntryLineEntity('line-1', 'entry-1', 'account-1', '100.00', '0.00', null),
      new JournalEntryLineEntity('line-2', 'entry-1', 'account-2', '0.00', '100.00', null),
    ],
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

function makeJournalEntryRepository(): jest.Mocked<JournalEntryRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByCompany: jest.fn(),
    findLedgerByAccount: jest.fn(),
    existsReversalOf: jest.fn(),
  } as jest.Mocked<JournalEntryRepository>;
}

describe('ApplyJournalEntryService', () => {
  function makeSut() {
    const chartOfAccountRepository = makeChartOfAccountRepository();
    const journalEntryRepository = makeJournalEntryRepository();
    chartOfAccountRepository.findById.mockResolvedValue(makeAccount());
    journalEntryRepository.create.mockImplementation(async (input) => makeJournalEntry({ id: input.id }));
    const service = new ApplyJournalEntryService(chartOfAccountRepository, journalEntryRepository);
    return { chartOfAccountRepository, journalEntryRepository, service };
  }

  it('crea el asiento cuando las líneas balancean', async () => {
    const { service, journalEntryRepository } = makeSut();

    await service.apply(
      {
        companyId: 'company-1',
        date: new Date('2026-07-01'),
        description: 'Venta de contado',
        currency: 'ARS',
        exchangeRate: '1',
        origin: 'AUTOMATIC',
        createdByUserId: 'user-1',
        lines: [
          { accountId: 'account-1', debit: '100.00', credit: '0' },
          { accountId: 'account-2', debit: '0', credit: '100.00' },
        ],
      },
      FAKE_TRANSACTION_CONTEXT,
    );

    expect(journalEntryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          expect.objectContaining({ accountId: 'account-1', debit: '100.00', credit: '0.00' }),
          expect.objectContaining({ accountId: 'account-2', debit: '0.00', credit: '100.00' }),
        ],
      }),
      FAKE_TRANSACTION_CONTEXT,
    );
  });

  it('RN-ACC-03: rechaza un asiento desbalanceado', async () => {
    const { service } = makeSut();

    await expect(
      service.apply(
        {
          companyId: 'company-1',
          date: new Date(),
          description: 'X',
          currency: 'ARS',
          exchangeRate: '1',
          origin: 'MANUAL',
          createdByUserId: 'user-1',
          lines: [
            { accountId: 'account-1', debit: '100.00', credit: '0' },
            { accountId: 'account-2', debit: '0', credit: '90.00' },
          ],
        },
        FAKE_TRANSACTION_CONTEXT,
      ),
    ).rejects.toThrow(UnbalancedJournalEntryError);
  });

  it('rechaza menos de dos líneas', async () => {
    const { service } = makeSut();

    await expect(
      service.apply(
        {
          companyId: 'company-1',
          date: new Date(),
          description: 'X',
          currency: 'ARS',
          exchangeRate: '1',
          origin: 'MANUAL',
          createdByUserId: 'user-1',
          lines: [{ accountId: 'account-1', debit: '100.00', credit: '0' }],
        },
        FAKE_TRANSACTION_CONTEXT,
      ),
    ).rejects.toThrow(EmptyJournalEntryLinesError);
  });

  it('RN-ACC-01: rechaza una cuenta agrupadora (no imputable)', async () => {
    const { service, chartOfAccountRepository } = makeSut();
    chartOfAccountRepository.findById.mockResolvedValue(makeAccount({ allowsMovements: false }));

    await expect(
      service.apply(
        {
          companyId: 'company-1',
          date: new Date(),
          description: 'X',
          currency: 'ARS',
          exchangeRate: '1',
          origin: 'MANUAL',
          createdByUserId: 'user-1',
          lines: [
            { accountId: 'account-1', debit: '100.00', credit: '0' },
            { accountId: 'account-2', debit: '0', credit: '100.00' },
          ],
        },
        FAKE_TRANSACTION_CONTEXT,
      ),
    ).rejects.toThrow(InvalidJournalEntryAccountError);
  });

  it('rechaza una cuenta que no existe en la empresa', async () => {
    const { service, chartOfAccountRepository } = makeSut();
    chartOfAccountRepository.findById.mockResolvedValue(null);

    await expect(
      service.apply(
        {
          companyId: 'company-1',
          date: new Date(),
          description: 'X',
          currency: 'ARS',
          exchangeRate: '1',
          origin: 'MANUAL',
          createdByUserId: 'user-1',
          lines: [
            { accountId: 'account-1', debit: '100.00', credit: '0' },
            { accountId: 'account-2', debit: '0', credit: '100.00' },
          ],
        },
        FAKE_TRANSACTION_CONTEXT,
      ),
    ).rejects.toThrow(InvalidJournalEntryAccountError);
  });
});

describe('CreateManualJournalEntryUseCase', () => {
  it('crea un asiento manual usando la moneda de la empresa por defecto', async () => {
    const chartOfAccountRepository = makeChartOfAccountRepository();
    const journalEntryRepository = makeJournalEntryRepository();
    chartOfAccountRepository.findById.mockResolvedValue(makeAccount());
    journalEntryRepository.create.mockImplementation(async (input) => makeJournalEntry({ id: input.id }));
    const applyJournalEntryService = new ApplyJournalEntryService(
      chartOfAccountRepository,
      journalEntryRepository,
    );
    const companyRepository = {
      create: jest.fn(),
      findAllForUser: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      setActive: jest.fn(),
    } as jest.Mocked<CompanyRepository>;
    companyRepository.findById.mockResolvedValue(makeCompany({ currency: 'ARS' }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateManualJournalEntryUseCase(
      applyJournalEntryService,
      companyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      description: 'Apertura',
      lines: [
        { accountId: 'account-1', debit: '500.00', credit: '0' },
        { accountId: 'account-2', debit: '0', credit: '500.00' },
      ],
    });

    expect(journalEntryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'ARS', origin: 'MANUAL' }),
      expect.anything(),
    );
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'journal_entry.create' }),
      expect.anything(),
    );
  });

  it('rechaza si el rol no autoriza', async () => {
    const applyJournalEntryService = {
      apply: jest.fn(),
    } as unknown as jest.Mocked<ApplyJournalEntryService>;
    const companyRepository = {
      create: jest.fn(),
      findAllForUser: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      setActive: jest.fn(),
    } as jest.Mocked<CompanyRepository>;
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateManualJournalEntryUseCase(
      applyJournalEntryService,
      companyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Empleado',
        companyId: 'company-1',
        description: 'Apertura',
        lines: [],
      }),
    ).rejects.toThrow(RoleNotAuthorizedError);
  });
});

describe('ReverseJournalEntryUseCase', () => {
  function makeSut() {
    const journalEntryRepository = makeJournalEntryRepository();
    const chartOfAccountRepository = makeChartOfAccountRepository();
    chartOfAccountRepository.findById.mockResolvedValue(makeAccount());
    journalEntryRepository.findById.mockResolvedValue(makeJournalEntry());
    journalEntryRepository.existsReversalOf.mockResolvedValue(false);
    journalEntryRepository.create.mockImplementation(async (input) =>
      makeJournalEntry({ id: input.id, reversalOfEntryId: input.reversalOfEntryId ?? null }),
    );
    const applyJournalEntryService = new ApplyJournalEntryService(
      chartOfAccountRepository,
      journalEntryRepository,
    );
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new ReverseJournalEntryUseCase(
      journalEntryRepository,
      applyJournalEntryService,
      auditLogRepository,
      createFakeUnitOfWork(),
    );
    return { journalEntryRepository, chartOfAccountRepository, auditLogRepository, useCase };
  }

  it('invierte débito y crédito de cada línea del asiento original', async () => {
    const { useCase, journalEntryRepository } = makeSut();

    await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      journalEntryId: 'entry-1',
    });

    expect(journalEntryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        reversalOfEntryId: 'entry-1',
        origin: 'MANUAL',
        lines: expect.arrayContaining([
          expect.objectContaining({ accountId: 'account-1', debit: '0.00', credit: '100.00' }),
          expect.objectContaining({ accountId: 'account-2', debit: '100.00', credit: '0.00' }),
        ]),
      }),
      expect.anything(),
    );
  });

  it('rechaza si el asiento no existe', async () => {
    const { useCase, journalEntryRepository } = makeSut();
    journalEntryRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        journalEntryId: 'no-existe',
      }),
    ).rejects.toThrow(JournalEntryNotFoundError);
  });

  it('rechaza revertir un asiento ya revertido', async () => {
    const { useCase, journalEntryRepository } = makeSut();
    journalEntryRepository.existsReversalOf.mockResolvedValue(true);

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        journalEntryId: 'entry-1',
      }),
    ).rejects.toThrow(JournalEntryAlreadyReversedError);
  });
});

describe('GetJournalEntryByIdUseCase / ListJournalEntriesUseCase', () => {
  it('devuelve el asiento cuando existe', async () => {
    const journalEntryRepository = makeJournalEntryRepository();
    journalEntryRepository.findById.mockResolvedValue(makeJournalEntry());
    const useCase = new GetJournalEntryByIdUseCase(journalEntryRepository);

    const result = await useCase.execute('entry-1', 'company-1');

    expect(result.id).toBe('entry-1');
  });

  it('lanza JournalEntryNotFoundError si no existe', async () => {
    const journalEntryRepository = makeJournalEntryRepository();
    journalEntryRepository.findById.mockResolvedValue(null);
    const useCase = new GetJournalEntryByIdUseCase(journalEntryRepository);

    await expect(useCase.execute('no-existe', 'company-1')).rejects.toThrow(
      JournalEntryNotFoundError,
    );
  });

  it('Libro Diario: pasa el rango de fechas al repositorio', async () => {
    const journalEntryRepository = makeJournalEntryRepository();
    journalEntryRepository.findAllByCompany.mockResolvedValue([makeJournalEntry()]);
    const useCase = new ListJournalEntriesUseCase(journalEntryRepository);

    const result = await useCase.execute({
      companyId: 'company-1',
      from: '2026-01-01',
      to: '2026-12-31',
    });

    expect(result).toHaveLength(1);
    expect(journalEntryRepository.findAllByCompany).toHaveBeenCalledWith('company-1', {
      from: new Date('2026-01-01'),
      to: new Date('2026-12-31'),
    });
  });
});

describe('GetAccountLedgerUseCase', () => {
  it('Libro Mayor: acumula el saldo en el sentido natural de una cuenta de Activo', async () => {
    const chartOfAccountRepository = makeChartOfAccountRepository();
    const journalEntryRepository = makeJournalEntryRepository();
    chartOfAccountRepository.findById.mockResolvedValue(makeAccount({ type: 'ASSET' }));
    journalEntryRepository.findLedgerByAccount.mockResolvedValue([
      { journalEntryId: 'entry-1', date: new Date('2026-07-01'), description: 'Apertura', debit: '100.00', credit: '0.00' },
      { journalEntryId: 'entry-2', date: new Date('2026-07-02'), description: 'Gasto', debit: '0.00', credit: '30.00' },
    ]);
    const useCase = new GetAccountLedgerUseCase(chartOfAccountRepository, journalEntryRepository);

    const result = await useCase.execute({ companyId: 'company-1', accountId: 'account-1' });

    expect(result.movements[0].runningBalance).toBe('100.00');
    expect(result.movements[1].runningBalance).toBe('70.00');
  });

  it('acumula el saldo en el sentido inverso para una cuenta de Pasivo', async () => {
    const chartOfAccountRepository = makeChartOfAccountRepository();
    const journalEntryRepository = makeJournalEntryRepository();
    chartOfAccountRepository.findById.mockResolvedValue(makeAccount({ type: 'LIABILITY' }));
    journalEntryRepository.findLedgerByAccount.mockResolvedValue([
      { journalEntryId: 'entry-1', date: new Date('2026-07-01'), description: 'Compra', debit: '0.00', credit: '100.00' },
    ]);
    const useCase = new GetAccountLedgerUseCase(chartOfAccountRepository, journalEntryRepository);

    const result = await useCase.execute({ companyId: 'company-1', accountId: 'account-1' });

    expect(result.movements[0].runningBalance).toBe('100.00');
  });

  it('lanza ChartOfAccountNotFoundError si la cuenta no existe', async () => {
    const chartOfAccountRepository = makeChartOfAccountRepository();
    const journalEntryRepository = makeJournalEntryRepository();
    chartOfAccountRepository.findById.mockResolvedValue(null);
    const useCase = new GetAccountLedgerUseCase(chartOfAccountRepository, journalEntryRepository);

    await expect(
      useCase.execute({ companyId: 'company-1', accountId: 'no-existe' }),
    ).rejects.toThrow(ChartOfAccountNotFoundError);
  });
});
