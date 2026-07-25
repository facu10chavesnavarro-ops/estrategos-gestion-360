import { Injectable } from '@nestjs/common';
import { WarehouseRepository } from '../../domain/repositories/warehouse.repository';
import { WarehouseEntity } from '../../domain/entities/warehouse.entity';
import { WarehouseNotFoundError } from '../../domain/errors/warehouse.errors';

@Injectable()
export class GetWarehouseByIdUseCase {
  constructor(private readonly warehouseRepository: WarehouseRepository) {}

  async execute(warehouseId: string, companyId: string): Promise<WarehouseEntity> {
    const warehouse = await this.warehouseRepository.findById(warehouseId, companyId);
    if (!warehouse) {
      throw new WarehouseNotFoundError();
    }
    return warehouse;
  }
}
