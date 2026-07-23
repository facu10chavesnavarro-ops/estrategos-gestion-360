import { SupplierImportRowProcessor } from '../../src/modules/suppliers/application/supplier-import-row-processor';
import { ImportSuppliersUseCase } from '../../src/modules/suppliers/application/use-cases/import-suppliers.use-case';
import { CsvImportEngine } from '../../src/common/application/csv-import.engine';
import { CsvParserPort } from '../../src/common/domain/import/csv-parser.port';
import { SupplierEntity } from '../../src/modules/suppliers/domain/entities/supplier.entity';
import { SupplierRepository } from '../../src/modules/suppliers/domain/repositories/supplier.repository';
import { PartyRepository } from '../../src/modules/parties/domain/repositories/party.repository';
import { PartyEntity } from '../../src/modules/parties/domain/entities/party.entity';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';

function makeParty(overrides: Partial<PartyEntity> = {}): PartyEntity {
  return new PartyEntity(
    overrides.id ?? 'party-1',
    overrides.companyId ?? 'company-1',
    overrides.legalName ?? 'Cliente Existente SRL',
    overrides.taxId ?? '30-11111111-1',
    overrides.taxCondition ?? null,
    overrides.email ?? null,
    overrides.phone ?? null,
    overrides.address ?? null,
    overrides.contactName ?? null,
    overrides.notes ?? null,
  );
}

function makeSupplier(overrides: Partial<SupplierEntity> = {}): SupplierEntity {
  return new SupplierEntity(
    overrides.id ?? 'supplier-1',
    overrides.partyId ?? 'party-1',
    overrides.companyId ?? 'company-1',
    overrides.legalName ?? 'Proveedor CSV SRL',
    overrides.taxId ?? '30-22222222-2',
    overrides.taxCondition ?? null,
    overrides.email ?? null,
    overrides.phone ?? null,
    overrides.address ?? null,
    overrides.contactName ?? null,
    overrides.notes ?? null,
    overrides.paymentTermDays ?? null,
    overrides.bankName ?? null,
    overrides.bankAccountHolder ?? null,
    overrides.bankCbu ?? null,
    overrides.isActive ?? true,
  );
}

function makeSupplierRepository(): jest.Mocked<SupplierRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByPartyId: jest.fn(),
    findAllByCompany: jest.fn(),
    update: jest.fn(),
    setActive: jest.fn(),
  } as jest.Mocked<SupplierRepository>;
}

function makePartyRepository(): jest.Mocked<PartyRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByTaxId: jest.fn(),
    update: jest.fn(),
  } as jest.Mocked<PartyRepository>;
}

describe('SupplierImportRowProcessor', () => {
  it('crea un Proveedor nuevo sobre un Party existente (ej. ya Cliente) en vez de rechazarlo como duplicado', async () => {
    const partyRepository = makePartyRepository();
    const supplierRepository = makeSupplierRepository();
    partyRepository.findByTaxId.mockResolvedValue(makeParty());
    supplierRepository.findByPartyId.mockResolvedValue(null);
    supplierRepository.create.mockResolvedValue(makeSupplier({ partyId: 'party-1' }));

    const processor = new SupplierImportRowProcessor(partyRepository, supplierRepository);
    const row = processor.parseRow({ legalName: 'Ignorado', taxId: '30-11111111-1' }, 2);
    const existing = await processor.findExisting(row, 'company-1');

    expect(existing).toBeNull();

    await processor.create(row, 'company-1');

    expect(partyRepository.create).not.toHaveBeenCalled();
    expect(supplierRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ partyId: 'party-1' }),
    );
  });

  it('parseRow rechaza una fila sin legalName', () => {
    const processor = new SupplierImportRowProcessor(makePartyRepository(), makeSupplierRepository());
    expect(() => processor.parseRow({ taxId: '30-11111111-1' }, 4)).toThrow(/legalName/);
  });
});

describe('ImportSuppliersUseCase', () => {
  it('procesa el CSV con el motor real y genera auditoría por fila + resumen', async () => {
    const partyRepository = makePartyRepository();
    const supplierRepository = makeSupplierRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const csvParser = {
      parse: jest.fn().mockReturnValue([{ legalName: 'Proveedor Uno', taxId: '30-22222222-2' }]),
    } as jest.Mocked<CsvParserPort>;

    partyRepository.findByTaxId.mockResolvedValue(null);
    partyRepository.create.mockResolvedValue(makeParty({ id: 'party-new' }));
    supplierRepository.create.mockResolvedValue(makeSupplier({ id: 'supplier-new', partyId: 'party-new' }));

    const engine = new CsvImportEngine(csvParser);
    const processor = new SupplierImportRowProcessor(partyRepository, supplierRepository);
    const useCase = new ImportSuppliersUseCase(engine, processor, auditLogRepository);

    const summary = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      csvContent: 'legalName,taxId\nProveedor Uno,30-22222222-2',
      mode: 'skip-new-only',
    });

    expect(summary.created).toBe(1);
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'supplier.import' }),
    );
  });
});
