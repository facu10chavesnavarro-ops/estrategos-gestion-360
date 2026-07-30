import { ItemImportRowProcessor } from '../../src/modules/catalog/application/item-import-row-processor';
import { ImportItemsUseCase } from '../../src/modules/catalog/application/use-cases/import-items.use-case';
import { ExportItemsUseCase } from '../../src/modules/catalog/application/use-cases/export-items.use-case';
import { CsvImportEngine } from '../../src/common/application/csv-import.engine';
import { CsvParserPort } from '../../src/common/domain/import/csv-parser.port';
import { ItemEntity } from '../../src/modules/catalog/domain/entities/item.entity';
import { ItemRepository } from '../../src/modules/catalog/domain/repositories/item.repository';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import { createFakeUnitOfWork } from '../support/fake-unit-of-work';

function makeItem(overrides: Partial<ItemEntity> = {}): ItemEntity {
  return new ItemEntity(
    overrides.id ?? 'item-1',
    overrides.companyId ?? 'company-1',
    overrides.type ?? 'PRODUCT',
    overrides.sku ?? 'SKU-1',
    overrides.name ?? 'Resma de papel A4',
    overrides.description ?? null,
    overrides.categoryId ?? null,
    overrides.unitOfMeasure ?? 'unidad',
    overrides.tracksStock ?? true,
    overrides.minimumStock ?? null,
    overrides.isActive ?? true,
    overrides.taxIds ?? [],
    overrides.longDescription ?? null,
    overrides.barcode ?? null,
    overrides.costPrice ?? null,
  );
}

function makeItemRepository(): jest.Mocked<ItemRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findBySku: jest.fn(),
    findByBarcode: jest.fn(),
    findAllByCompany: jest.fn(),
    update: jest.fn(),
    setActive: jest.fn(),
  } as jest.Mocked<ItemRepository>;
}

describe('ItemImportRowProcessor', () => {
  it('parseRow rechaza una fila sin sku', () => {
    const processor = new ItemImportRowProcessor(makeItemRepository());
    expect(() =>
      processor.parseRow({ type: 'PRODUCT', name: 'X', unitOfMeasure: 'unidad' }, 4),
    ).toThrow(/sku/);
  });

  it('parseRow rechaza un type inválido', () => {
    const processor = new ItemImportRowProcessor(makeItemRepository());
    expect(() =>
      processor.parseRow(
        { type: 'GADGET', sku: 'SKU-1', name: 'X', unitOfMeasure: 'unidad' },
        2,
      ),
    ).toThrow(/PRODUCT o SERVICE/);
  });

  it('parseRow rechaza costPrice negativo', () => {
    const processor = new ItemImportRowProcessor(makeItemRepository());
    expect(() =>
      processor.parseRow(
        { type: 'PRODUCT', sku: 'SKU-1', name: 'X', unitOfMeasure: 'unidad', costPrice: '-5' },
        3,
      ),
    ).toThrow(/costPrice/);
  });

  it('RN-CAT-07: un Servicio importado nunca controla stock aunque la fila lo pida', async () => {
    const itemRepository = makeItemRepository();
    itemRepository.create.mockResolvedValue(makeItem({ type: 'SERVICE', tracksStock: false }));
    const processor = new ItemImportRowProcessor(itemRepository);

    const row = processor.parseRow(
      { type: 'SERVICE', sku: 'SRV-1', name: 'Consultoría', unitOfMeasure: 'hora', tracksStock: 'true' },
      2,
    );
    await processor.create(row, 'company-1');

    expect(itemRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ tracksStock: false }),
      undefined,
    );
  });

  it('findExisting deduplica por sku', async () => {
    const itemRepository = makeItemRepository();
    itemRepository.findBySku.mockResolvedValue(makeItem());
    const processor = new ItemImportRowProcessor(itemRepository);

    const row = processor.parseRow(
      { type: 'PRODUCT', sku: 'SKU-1', name: 'X', unitOfMeasure: 'unidad' },
      2,
    );
    const existing = await processor.findExisting(row, 'company-1');

    expect(existing).not.toBeNull();
    expect(itemRepository.findBySku).toHaveBeenCalledWith('company-1', 'SKU-1', undefined);
  });
});

describe('ImportItemsUseCase', () => {
  it('procesa el CSV con el motor real y genera auditoría por fila + resumen', async () => {
    const itemRepository = makeItemRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const csvParser = {
      parse: jest.fn().mockReturnValue([
        { type: 'PRODUCT', sku: 'SKU-1', name: 'Ítem Uno', unitOfMeasure: 'unidad' },
        { type: 'SERVICE', sku: 'SRV-1', name: 'Ítem Dos', unitOfMeasure: 'hora' },
      ]),
    } as jest.Mocked<CsvParserPort>;

    itemRepository.findBySku.mockResolvedValue(null);
    itemRepository.create.mockImplementation(async (input) =>
      makeItem({ id: `item-${input.sku}`, sku: input.sku, name: input.name, type: input.type }),
    );

    const engine = new CsvImportEngine(csvParser, createFakeUnitOfWork());
    const processor = new ItemImportRowProcessor(itemRepository);
    const useCase = new ImportItemsUseCase(engine, processor, auditLogRepository);

    const summary = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      csvContent:
        'type,sku,name,unitOfMeasure\nPRODUCT,SKU-1,Ítem Uno,unidad\nSERVICE,SRV-1,Ítem Dos,hora',
      mode: 'skip-new-only',
    });

    expect(summary.created).toBe(2);
    expect(summary.rejected).toHaveLength(0);
    expect(auditLogRepository.record).toHaveBeenCalledTimes(3);
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'item.import', metadata: expect.objectContaining({ created: 2 }) }),
    );
  });

  it('rechaza si el rol no autoriza', async () => {
    const itemRepository = makeItemRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const csvParser = { parse: jest.fn() } as jest.Mocked<CsvParserPort>;
    const engine = new CsvImportEngine(csvParser, createFakeUnitOfWork());
    const processor = new ItemImportRowProcessor(itemRepository);
    const useCase = new ImportItemsUseCase(engine, processor, auditLogRepository);

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Empleado',
        companyId: 'company-1',
        csvContent: 'sku\nX',
        mode: 'skip-new-only',
      }),
    ).rejects.toThrow(RoleNotAuthorizedError);

    expect(csvParser.parse).not.toHaveBeenCalled();
  });
});

describe('ExportItemsUseCase', () => {
  it('exporta los ítems de la empresa como CSV con encabezado', async () => {
    const itemRepository = makeItemRepository();
    itemRepository.findAllByCompany.mockResolvedValue([
      makeItem({ sku: 'SKU-1', name: 'Resma A4', barcode: '7791234567890' }),
      makeItem({ id: 'item-2', sku: 'SKU-2', name: 'Con "comillas", y coma' }),
    ]);
    const useCase = new ExportItemsUseCase(itemRepository);

    const csv = await useCase.execute({ companyId: 'company-1' });

    expect(itemRepository.findAllByCompany).toHaveBeenCalledWith('company-1', {
      type: undefined,
      categoryId: undefined,
      isActive: undefined,
      search: undefined,
    });
    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toBe(
      'sku,name,type,unitOfMeasure,description,longDescription,barcode,tracksStock,minimumStock,costPrice,isActive',
    );
    expect(lines[1]).toContain('SKU-1');
    expect(lines[1]).toContain('7791234567890');
    // Comillas y coma dentro de un valor se escapan según RFC 4180.
    expect(lines[2]).toContain('"Con ""comillas"", y coma"');
  });

  it('respeta los filtros recibidos', async () => {
    const itemRepository = makeItemRepository();
    itemRepository.findAllByCompany.mockResolvedValue([]);
    const useCase = new ExportItemsUseCase(itemRepository);

    await useCase.execute({ companyId: 'company-1', type: 'SERVICE', isActive: true, search: 'consult' });

    expect(itemRepository.findAllByCompany).toHaveBeenCalledWith('company-1', {
      type: 'SERVICE',
      categoryId: undefined,
      isActive: true,
      search: 'consult',
    });
  });
});
