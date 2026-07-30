import { Injectable } from '@nestjs/common';
import { toCsv } from '../../../../common/application/csv-writer';
import { ItemRepository } from '../../domain/repositories/item.repository';
import { ListItemsUseCaseInput } from '../dto/item.dto';

/**
 * Primer caso de exportación CSV del backend. Mismas columnas que acepta
 * ImportItemsUseCase (permite exportar → editar en planilla → reimportar
 * en modo update-existing), respeta los mismos filtros que ListItemsUseCase
 * para exportar exactamente lo que el usuario está viendo en pantalla.
 */
@Injectable()
export class ExportItemsUseCase {
  constructor(private readonly itemRepository: ItemRepository) {}

  async execute(input: ListItemsUseCaseInput): Promise<string> {
    const items = await this.itemRepository.findAllByCompany(input.companyId, {
      type: input.type,
      categoryId: input.categoryId,
      isActive: input.isActive,
      search: input.search,
    });

    return toCsv(items, [
      { key: 'sku', header: 'sku' },
      { key: 'name', header: 'name' },
      { key: 'type', header: 'type' },
      { key: 'unitOfMeasure', header: 'unitOfMeasure' },
      { key: 'description', header: 'description' },
      { key: 'longDescription', header: 'longDescription' },
      { key: 'barcode', header: 'barcode' },
      { key: 'tracksStock', header: 'tracksStock' },
      { key: 'minimumStock', header: 'minimumStock' },
      { key: 'costPrice', header: 'costPrice' },
      { key: 'isActive', header: 'isActive' },
    ]);
  }
}
