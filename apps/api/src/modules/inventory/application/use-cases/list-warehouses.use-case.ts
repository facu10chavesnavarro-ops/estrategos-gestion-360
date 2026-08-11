import { Injectable } from '@nestjs/common';
import { WarehouseRepository } from '../../domain/repositories/warehouse.repository';
import { WarehouseEntity } from '../../domain/entities/warehouse.entity';

@Injectable()
export class ListWarehousesUseCase {
  constructor(private readonly warehouseRepository: WarehouseRepository) {}

  async execute(branchId: string, companyId: string): Promise<WarehouseEntity[]> {
    return this.warehouseRepository.findAllByBranch(branchId, companyId);
  }
}
