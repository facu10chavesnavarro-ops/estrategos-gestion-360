import { Injectable } from '@nestjs/common';
import { StockRepository } from '../../domain/repositories/stock.repository';
import { StockEntity } from '../../domain/entities/stock.entity';
import { ListStockUseCaseInput } from '../dto/stock.dto';

@Injectable()
export class ListStockUseCase {
  constructor(private readonly stockRepository: StockRepository) {}

  async execute(input: ListStockUseCaseInput): Promise<StockEntity[]> {
    return this.stockRepository.findAllByWarehouse(input.warehouseId, input.companyId, {
      itemId: input.itemId,
    });
  }
}
