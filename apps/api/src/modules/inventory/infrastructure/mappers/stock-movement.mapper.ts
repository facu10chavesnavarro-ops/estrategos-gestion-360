import { StockMovement as PrismaStockMovement } from '@prisma/client';
import { StockMovementEntity, StockMovementType } from '../../domain/entities/stock-movement.entity';

export class StockMovementMapper {
  static toDomain(raw: PrismaStockMovement): StockMovementEntity {
    return new StockMovementEntity(
      raw.id,
      raw.companyId,
      raw.itemId,
      raw.warehouseId,
      raw.type as StockMovementType,
      raw.quantity.toString(),
      raw.unitCost.toString(),
      raw.reason,
      raw.transferGroupId,
      raw.userId,
      raw.createdAt,
    );
  }
}
