import { Injectable } from '@nestjs/common';
import { StockMovementRepository } from '../../domain/repositories/stock-movement.repository';
import { StockMovementEntity } from '../../domain/entities/stock-movement.entity';
import { ListStockMovementsUseCaseInput } from '../dto/stock-movement.dto';

@Injectable()
export class ListStockMovementsUseCase {
  constructor(private readonly stockMovementRepository: StockMovementRepository) {}

  async execute(input: ListStockMovementsUseCaseInput): Promise<StockMovementEntity[]> {
    return this.stockMovementRepository.findAllByWarehouse(input.warehouseId, input.companyId, {
      itemId: input.itemId,
      type: input.type,
      from: input.from ? new Date(input.from) : undefined,
      to: input.to ? new Date(input.to) : undefined,
    });
  }
}
