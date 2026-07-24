import { CustomerImportRowProcessor } from '../../src/modules/customers/application/customer-import-row-processor';
import { ImportCustomersUseCase } from '../../src/modules/customers/application/use-cases/import-customers.use-case';
import { CsvImportEngine } from '../../src/common/application/csv-import.engine';
import { CsvParserPort } from '../../src/common/domain/import/csv-parser.port';
import { CustomerEntity } from '../../src/modules/customers/domain/entities/customer.entity';
import { CustomerRepository } from '../../src/modules/customers/domain/repositories/customer.repository';
import { PartyRepository } from '../../src/modules/parties/domain/repositories/party.repository';
import { PartyEntity } from '../../src/modules/parties/domain/entities/party.entity';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import { createFakeUnitOfWork } from '../support/fake-unit-of-work';

function makeParty(overrides: Partial<PartyEntity> = {}): PartyEntity {
  return new PartyEntity(
    overrides.id ?? 'party-1',
    overrides.companyId ?? 'company-1',
    overrides.legalName ?? 'Proveedor Existente SRL',
    overrides.taxId ?? '30-11111111-1',
    overrides.taxCondition ?? null,
    overrides.email ?? null,
    overrides.phone ?? null,
    overrides.address ?? null,
    overrides.contactName ?? null,
    overrides.notes ?? null,
  );
}

function makeCustomer(overrides: Partial<CustomerEntity> = {}): CustomerEntity {
  return new CustomerEntity(
    overrides.id ?? 'customer-1',
    overrides.partyId ?? 'party-1',
    overrides.companyId ?? 'company-1',
    overrides.legalName ?? 'Cliente CSV SRL',
    overrides.taxId ?? '30-22222222-2',
    overrides.taxCondition ?? null,
    overrides.email ?? null,
    overrides.phone ?? null,
    overrides.address ?? null,
    overrides.contactName ?? null,
    overrides.notes ?? null,
    overrides.paymentTermDays ?? null,
    overrides.creditLimit ?? null,
    overrides.isActive ?? true,
  );
}

function makeCustomerRepository(): jest.Mocked<CustomerRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByPartyId: jest.fn(),
    findAllByCompany: jest.fn(),
    update: jest.fn(),
    setActive: jest.fn(),
  } as jest.Mocked<CustomerRepository>;
}

function makePartyRepository(): jest.Mocked<PartyRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByTaxId: jest.fn(),
    update: jest.fn(),
  } as jest.Mocked<PartyRepository>;
}

describe('CustomerImportRowProcessor', () => {
  it('crea un Cliente nuevo sobre un Party existente (ej. ya Proveedor) en vez de rechazarlo como duplicado', async () => {
    const partyRepository = makePartyRepository();
    const customerRepository = makeCustomerRepository();
    partyRepository.findByTaxId.mockResolvedValue(makeParty()); // el Party ya existe (es Proveedor)
    customerRepository.findByPartyId.mockResolvedValue(null); // pero no tiene rol Cliente
    customerRepository.create.mockResolvedValue(makeCustomer({ partyId: 'party-1' }));

    const processor = new CustomerImportRowProcessor(partyRepository, customerRepository);
    const row = processor.parseRow({ legalName: 'Ignorado', taxId: '30-11111111-1' }, 2);
    const existing = await processor.findExisting(row, 'company-1');

    expect(existing).toBeNull(); // no es "duplicado" porque no tiene rol Cliente todavía

    const created = await processor.create(row, 'company-1');

    expect(partyRepository.create).not.toHaveBeenCalled(); // reutiliza el Party, no lo pisa
    expect(customerRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ partyId: 'party-1' }),
      undefined,
    );
    expect(created.partyId).toBe('party-1');
  });

  it('parseRow rechaza una fila sin legalName', () => {
    const processor = new CustomerImportRowProcessor(makePartyRepository(), makeCustomerRepository());
    expect(() => processor.parseRow({ taxId: '30-11111111-1' }, 5)).toThrow(/legalName/);
  });

  it('parseRow rechaza creditLimit negativo', () => {
    const processor = new CustomerImportRowProcessor(makePartyRepository(), makeCustomerRepository());
    expect(() =>
      processor.parseRow({ legalName: 'X', creditLimit: '-1' }, 3),
    ).toThrow(/límite de crédito/);
  });
});

describe('ImportCustomersUseCase', () => {
  it('procesa el CSV con el motor real y genera auditoría por fila + resumen', async () => {
    const partyRepository = makePartyRepository();
    const customerRepository = makeCustomerRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const csvParser = {
      parse: jest.fn().mockReturnValue([
        { legalName: 'Cliente Uno', taxId: '30-22222222-2' },
        { legalName: 'Cliente Dos' }, // sin CUIT, siempre se crea
      ]),
    } as jest.Mocked<CsvParserPort>;

    partyRepository.findByTaxId.mockResolvedValue(null);
    partyRepository.create.mockImplementation(async (input) =>
      makeParty({ id: `party-${input.legalName}`, legalName: input.legalName, taxId: input.taxId ?? null }),
    );
    customerRepository.create.mockImplementation(async (input) =>
      makeCustomer({ id: `customer-${input.partyId}`, partyId: input.partyId }),
    );

    const engine = new CsvImportEngine(csvParser, createFakeUnitOfWork());
    const processor = new CustomerImportRowProcessor(partyRepository, customerRepository);
    const useCase = new ImportCustomersUseCase(engine, processor, auditLogRepository);

    const summary = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      csvContent: 'legalName,taxId\nCliente Uno,30-22222222-2\nCliente Dos,',
      mode: 'skip-new-only',
    });

    expect(summary.created).toBe(2);
    expect(summary.rejected).toHaveLength(0);
    // 2 auditorías por fila + 1 resumen
    expect(auditLogRepository.record).toHaveBeenCalledTimes(3);
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'customer.import', metadata: expect.objectContaining({ created: 2 }) }),
    );
  });

  it('rechaza si el rol no autoriza', async () => {
    const partyRepository = makePartyRepository();
    const customerRepository = makeCustomerRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const csvParser = { parse: jest.fn() } as jest.Mocked<CsvParserPort>;
    const engine = new CsvImportEngine(csvParser, createFakeUnitOfWork());
    const processor = new CustomerImportRowProcessor(partyRepository, customerRepository);
    const useCase = new ImportCustomersUseCase(engine, processor, auditLogRepository);

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Empleado',
        companyId: 'company-1',
        csvContent: 'legalName\nX',
        mode: 'skip-new-only',
      }),
    ).rejects.toThrow(RoleNotAuthorizedError);

    expect(csvParser.parse).not.toHaveBeenCalled();
  });
});
