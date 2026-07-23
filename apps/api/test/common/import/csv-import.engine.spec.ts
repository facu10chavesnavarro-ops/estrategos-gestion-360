import { CsvImportEngine } from '../../../src/common/application/csv-import.engine';
import { CsvParserPort } from '../../../src/common/domain/import/csv-parser.port';
import { ImportRowProcessor } from '../../../src/common/domain/import/import-row-processor';
import { ImportRowValidationError } from '../../../src/common/domain/import/import-row-validation.error';

interface FakeRow {
  key: string;
  value: string;
}
interface FakeEntity {
  id: string;
  key: string;
  value: string;
}

/** Processor mock en memoria — el motor no debe saber nada de una entidad real. */
class FakeRowProcessor implements ImportRowProcessor<FakeRow, FakeEntity> {
  readonly entityType = 'Fake';
  private store = new Map<string, FakeEntity>();
  private nextId = 1;

  parseRow(rawRow: Record<string, string>): FakeRow {
    if (!rawRow.key) {
      throw new ImportRowValidationError('falta "key"');
    }
    return { key: rawRow.key, value: rawRow.value ?? '' };
  }

  async findExisting(row: FakeRow): Promise<FakeEntity | null> {
    return this.store.get(row.key) ?? null;
  }

  async create(row: FakeRow): Promise<FakeEntity> {
    const entity: FakeEntity = { id: `id-${this.nextId++}`, key: row.key, value: row.value };
    this.store.set(row.key, entity);
    return entity;
  }

  async applyUpdate(
    existing: FakeEntity,
    row: FakeRow,
  ): Promise<{ entity: FakeEntity; changedFields: string[] }> {
    const changedFields: string[] = [];
    if (existing.value !== row.value) {
      changedFields.push('value');
    }
    const updated = { ...existing, value: row.value };
    this.store.set(row.key, updated);
    return { entity: updated, changedFields };
  }

  getEntityId(entity: FakeEntity): string {
    return entity.id;
  }
}

function makeParser(rows: Record<string, string>[]): jest.Mocked<CsvParserPort> {
  return { parse: jest.fn().mockReturnValue(rows) } as jest.Mocked<CsvParserPort>;
}

describe('CsvImportEngine', () => {
  it('crea filas nuevas y reporta el número de fila correcto (encabezado + 1-index)', async () => {
    const parser = makeParser([{ key: 'a', value: '1' }, { key: 'b', value: '2' }]);
    const engine = new CsvImportEngine(parser);
    const processor = new FakeRowProcessor();

    const results = await engine.run('csv', 'company-1', 'skip-new-only', processor);

    expect(results).toEqual([
      { row: 2, outcome: 'created', entityId: 'id-1' },
      { row: 3, outcome: 'created', entityId: 'id-2' },
    ]);
  });

  it('una fila inválida se rechaza y no interrumpe el procesamiento de las demás', async () => {
    const parser = makeParser([{ key: 'a', value: '1' }, { value: 'sin key' }, { key: 'c', value: '3' }]);
    const engine = new CsvImportEngine(parser);
    const processor = new FakeRowProcessor();

    const results = await engine.run('csv', 'company-1', 'skip-new-only', processor);

    expect(results[0].outcome).toBe('created');
    expect(results[1]).toEqual({ row: 3, outcome: 'rejected', reason: 'falta "key"' });
    expect(results[2].outcome).toBe('created');
  });

  it('modo skip-new-only: rechaza una fila duplicada sin modificar el registro existente', async () => {
    const processor = new FakeRowProcessor();
    await processor.create({ key: 'a', value: 'original' });

    const parser = makeParser([{ key: 'a', value: 'nuevo' }]);
    const engine = new CsvImportEngine(parser);

    const results = await engine.run('csv', 'company-1', 'skip-new-only', processor);

    expect(results[0].outcome).toBe('rejected');
    expect(await processor.findExisting({ key: 'a', value: '' })).toEqual(
      expect.objectContaining({ value: 'original' }),
    );
  });

  it('modo skip-silently: omite el duplicado sin marcarlo como error', async () => {
    const processor = new FakeRowProcessor();
    await processor.create({ key: 'a', value: 'original' });

    const parser = makeParser([{ key: 'a', value: 'nuevo' }]);
    const engine = new CsvImportEngine(parser);

    const results = await engine.run('csv', 'company-1', 'skip-silently', processor);

    expect(results[0]).toEqual({ row: 2, outcome: 'skipped-duplicate' });
  });

  it('modo update-existing: actualiza el registro y reporta los campos cambiados', async () => {
    const processor = new FakeRowProcessor();
    await processor.create({ key: 'a', value: 'original' });

    const parser = makeParser([{ key: 'a', value: 'actualizado' }]);
    const engine = new CsvImportEngine(parser);

    const results = await engine.run('csv', 'company-1', 'update-existing', processor);

    expect(results[0]).toEqual({
      row: 2,
      outcome: 'updated',
      entityId: 'id-1',
      changedFields: ['value'],
    });
  });
});
