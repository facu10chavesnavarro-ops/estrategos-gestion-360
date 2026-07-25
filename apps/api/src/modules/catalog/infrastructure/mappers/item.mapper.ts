import { Item as PrismaItem, ItemTax as PrismaItemTax } from '@prisma/client';
import { ItemEntity, ItemType } from '../../domain/entities/item.entity';

type PrismaItemWithTaxes = PrismaItem & { itemTaxes: PrismaItemTax[] };

export class ItemMapper {
  static toDomain(raw: PrismaItemWithTaxes): ItemEntity {
    return new ItemEntity(
      raw.id,
      raw.companyId,
      raw.type as ItemType,
      raw.sku,
      raw.name,
      raw.description,
      raw.categoryId,
      raw.unitOfMeasure,
      raw.tracksStock,
      raw.minimumStock?.toString() ?? null,
      raw.isActive,
      raw.itemTaxes.map((it) => it.taxId),
    );
  }
}
