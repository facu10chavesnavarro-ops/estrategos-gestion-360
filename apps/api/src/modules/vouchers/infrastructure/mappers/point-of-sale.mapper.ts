import { PointOfSale as PrismaPointOfSale } from '@prisma/client';
import { PointOfSaleEntity } from '../../domain/entities/point-of-sale.entity';

export class PointOfSaleMapper {
  static toDomain(raw: PrismaPointOfSale): PointOfSaleEntity {
    return new PointOfSaleEntity(
      raw.id,
      raw.companyId,
      raw.branchId,
      raw.code,
      raw.name,
      raw.isActive,
    );
  }
}
