import { Warehouse as PrismaWarehouse } from '@prisma/client';
import { WarehouseEntity } from '../../domain/entities/warehouse.entity';

export class WarehouseMapper {
  static toDomain(raw: PrismaWarehouse): WarehouseEntity {
    return new WarehouseEntity(raw.id, raw.companyId, raw.branchId, raw.name, raw.isActive);
  }
}
