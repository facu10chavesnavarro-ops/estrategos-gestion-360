import { PriceList as PrismaPriceList, PriceListItem as PrismaPriceListItem } from '@prisma/client';
import { PriceListEntity, PriceListItemEntity } from '../../domain/entities/price-list.entity';

export class PriceListMapper {
  static toDomain(raw: PrismaPriceList): PriceListEntity {
    return new PriceListEntity(
      raw.id,
      raw.companyId,
      raw.name,
      raw.currency,
      raw.isDefault,
      raw.validFrom,
      raw.validTo,
      raw.isActive,
    );
  }

  static itemToDomain(raw: PrismaPriceListItem): PriceListItemEntity {
    return new PriceListItemEntity(raw.priceListId, raw.itemId, raw.price.toString());
  }
}
