import { Injectable } from '@nestjs/common';
import { CsvParserPort } from '../domain/import/csv-parser.port';
import { ImportRowProcessor } from '../domain/import/import-row-processor';
import { ImportMode, ImportRowResult } from '../domain/import/import.types';
import { ImportRowValidationError } from '../domain/import/import-row-validation.error';

/**
 * Motor de importación CSV agnóstico de entidad (Clientes, Proveedores, y a
 * futuro Productos/Servicios/Plan de cuentas/Bancos/Stock). No escribe
 * auditoría ni conoce Prisma — decide qué hacer con cada fila, no ejecuta
 * efectos de negocio más allá de delegarlos al ImportRowProcessor.
 * Ver docs/sprint-2/01-clientes-proveedores.md §0.6.
 */
@Injectable()
export class CsvImportEngine {
  constructor(private readonly csvParser: CsvParserPort) {}

  async run<TRow, TEntity>(
    csvContent: string,
    companyId: string,
    mode: ImportMode,
    processor: ImportRowProcessor<TRow, TEntity>,
  ): Promise<ImportRowResult[]> {
    const rawRows = this.csvParser.parse(csvContent);
    const results: ImportRowResult[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      // +2: la fila 1 del CSV (índice 0) es la primera fila de datos después
      // del encabezado, que un usuario que abre el archivo en una planilla
      // ve como la línea 2.
      const rowNumber = i + 2;
      try {
        const row = processor.parseRow(rawRows[i], rowNumber);
        const existing = await processor.findExisting(row, companyId);

        if (!existing) {
          const entity = await processor.create(row, companyId);
          results.push({
            row: rowNumber,
            outcome: 'created',
            entityId: processor.getEntityId(entity),
          });
          continue;
        }

        results.push(
          await this.handleExisting(existing, row, rowNumber, mode, processor),
        );
      } catch (error) {
        const reason =
          error instanceof ImportRowValidationError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Error desconocido';
        results.push({ row: rowNumber, outcome: 'rejected', reason });
      }
    }

    return results;
  }

  private async handleExisting<TRow, TEntity>(
    existing: TEntity,
    row: TRow,
    rowNumber: number,
    mode: ImportMode,
    processor: ImportRowProcessor<TRow, TEntity>,
  ): Promise<ImportRowResult> {
    if (mode === 'skip-new-only') {
      return { row: rowNumber, outcome: 'rejected', reason: 'Ya existe (CUIT duplicado)' };
    }
    if (mode === 'skip-silently') {
      return { row: rowNumber, outcome: 'skipped-duplicate' };
    }
    const { entity, changedFields } = await processor.applyUpdate(existing, row);
    return {
      row: rowNumber,
      outcome: 'updated',
      entityId: processor.getEntityId(entity),
      changedFields,
    };
  }
}
