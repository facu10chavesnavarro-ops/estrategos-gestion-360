import { Injectable } from '@nestjs/common';
import { ImportRowProcessor } from '../../../common/domain/import/import-row-processor';
import { ImportRowValidationError } from '../../../common/domain/import/import-row-validation.error';
import { TransactionContext } from '../../../common/domain/transaction/transaction-context';
import { ItemRepository } from '../domain/repositories/item.repository';
import { ItemEntity, ItemType } from '../domain/entities/item.entity';

export interface ItemImportRow {
  type: ItemType;
  sku: string;
  name: string;
  unitOfMeasure: string;
  description?: string;
  longDescription?: string;
  barcode?: string;
  tracksStock?: boolean;
  minimumStock?: string;
  costPrice?: string;
}

/**
 * Única pieza específica de Ítems en la importación CSV — el resto vive
 * en el motor genérico (common/application/csv-import.engine.ts), mismo
 * patrón que CustomerImportRowProcessor/SupplierImportRowProcessor de F2.
 * Columnas esperadas del CSV (encabezado exacto): type, sku, name,
 * unitOfMeasure, description, longDescription, barcode, tracksStock,
 * minimumStock, costPrice. Solo type/sku/name/unitOfMeasure son
 * obligatorias.
 *
 * Deliberadamente fuera de alcance en v1: categoryId y taxIds por CSV —
 * el usuario no conoce esos ids de memoria; se asignan después desde la
 * UI (mismo criterio que dejar `Party` fuera del CSV en F2 hasta que
 * hiciera falta).
 */
@Injectable()
export class ItemImportRowProcessor implements ImportRowProcessor<ItemImportRow, ItemEntity> {
  readonly entityType = 'Item';

  constructor(private readonly itemRepository: ItemRepository) {}

  parseRow(rawRow: Record<string, string>, rowNumber: number): ItemImportRow {
    const type = rawRow.type?.trim().toUpperCase();
    if (type !== 'PRODUCT' && type !== 'SERVICE') {
      throw new ImportRowValidationError(
        `Fila ${rowNumber}: "type" debe ser PRODUCT o SERVICE.`,
      );
    }

    const sku = rawRow.sku?.trim();
    if (!sku) {
      throw new ImportRowValidationError(`Fila ${rowNumber}: falta "sku".`);
    }

    const name = rawRow.name?.trim();
    if (!name) {
      throw new ImportRowValidationError(`Fila ${rowNumber}: falta "name".`);
    }

    const unitOfMeasure = rawRow.unitOfMeasure?.trim();
    if (!unitOfMeasure) {
      throw new ImportRowValidationError(`Fila ${rowNumber}: falta "unitOfMeasure".`);
    }

    const tracksStockRaw = rawRow.tracksStock?.trim().toLowerCase();
    const tracksStock =
      tracksStockRaw === undefined || tracksStockRaw === ''
        ? undefined
        : tracksStockRaw === 'true';

    const minimumStock = rawRow.minimumStock?.trim() || undefined;
    if (minimumStock !== undefined && Number(minimumStock) < 0) {
      throw new ImportRowValidationError(`Fila ${rowNumber}: "minimumStock" no puede ser negativo.`);
    }

    const costPrice = rawRow.costPrice?.trim() || undefined;
    if (costPrice !== undefined && Number(costPrice) < 0) {
      throw new ImportRowValidationError(`Fila ${rowNumber}: "costPrice" no puede ser negativo.`);
    }

    return {
      type,
      sku,
      name,
      unitOfMeasure,
      description: rawRow.description?.trim() || undefined,
      longDescription: rawRow.longDescription?.trim() || undefined,
      barcode: rawRow.barcode?.trim() || undefined,
      tracksStock,
      minimumStock,
      costPrice,
    };
  }

  async findExisting(
    row: ItemImportRow,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<ItemEntity | null> {
    return this.itemRepository.findBySku(companyId, row.sku, ctx);
  }

  async create(row: ItemImportRow, companyId: string, ctx?: TransactionContext): Promise<ItemEntity> {
    // RN-CAT-07: un Servicio nunca controla stock, igual que en el alta manual.
    const tracksStock = row.type === 'SERVICE' ? false : (row.tracksStock ?? false);
    return this.itemRepository.create(
      {
        companyId,
        type: row.type,
        sku: row.sku,
        name: row.name,
        unitOfMeasure: row.unitOfMeasure,
        description: row.description,
        longDescription: row.longDescription,
        barcode: row.barcode,
        tracksStock,
        minimumStock: tracksStock ? row.minimumStock : undefined,
        costPrice: row.costPrice,
        taxIds: [],
      },
      ctx,
    );
  }

  async applyUpdate(
    existing: ItemEntity,
    row: ItemImportRow,
    ctx?: TransactionContext,
  ): Promise<{ entity: ItemEntity; changedFields: string[] }> {
    const changedFields: string[] = [];
    const patch: Record<string, unknown> = {};

    if (row.name !== existing.name) {
      patch.name = row.name;
      changedFields.push('name');
    }
    if (row.unitOfMeasure !== existing.unitOfMeasure) {
      patch.unitOfMeasure = row.unitOfMeasure;
      changedFields.push('unitOfMeasure');
    }
    for (const field of ['description', 'longDescription', 'barcode', 'costPrice'] as const) {
      if (row[field] !== undefined && row[field] !== existing[field]) {
        patch[field] = row[field];
        changedFields.push(field);
      }
    }
    // RN-CAT-07: no se activa tracksStock por CSV en un Servicio.
    const tracksStock = existing.type === 'SERVICE' ? false : (row.tracksStock ?? existing.tracksStock);
    if (tracksStock !== existing.tracksStock) {
      patch.tracksStock = tracksStock;
      changedFields.push('tracksStock');
    }
    if (row.minimumStock !== undefined && row.minimumStock !== existing.minimumStock) {
      patch.minimumStock = tracksStock ? row.minimumStock : null;
      changedFields.push('minimumStock');
    }

    if (Object.keys(patch).length === 0) {
      return { entity: existing, changedFields: [] };
    }

    const updated = await this.itemRepository.update(existing.id, patch, ctx);
    return { entity: updated, changedFields };
  }

  getEntityId(entity: ItemEntity): string {
    return entity.id;
  }
}
