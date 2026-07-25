import { Stock as PrismaStock } from '@prisma/client';
import { StockEntity } from '../../domain/entities/stock.entity';

export class StockMapper {
  static toDomain(raw: PrismaStock): StockEntity {
    return new StockEntity(
      raw.companyId,
      raw.itemId,
      raw.warehouseId,
      raw.quantity.toString(),
      raw.averageCost.toString(),
    );
  }
}
