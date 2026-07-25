import { Injectable } from '@nestjs/common';
import { PriceListRepository } from '../../domain/repositories/price-list.repository';
import { PriceListItemEntity } from '../../domain/entities/price-list.entity';
import { PriceListNotFoundError } from '../../domain/errors/price-list.errors';

@Injectable()
export class ListPriceListItemsUseCase {
  constructor(private readonly priceListRepository: PriceListRepository) {}

  async execute(priceListId: string, companyId: string): Promise<PriceListItemEntity[]> {
    const priceList = await this.priceListRepository.findById(priceListId, companyId);
    if (!priceList) {
      throw new PriceListNotFoundError();
    }
    return this.priceListRepository.listItems(priceListId);
  }
}
