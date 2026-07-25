import { Injectable } from '@nestjs/common';
import { PriceListRepository } from '../../domain/repositories/price-list.repository';
import { PriceListEntity } from '../../domain/entities/price-list.entity';
import { ListPriceListsUseCaseInput } from '../dto/price-list.dto';

@Injectable()
export class ListPriceListsUseCase {
  constructor(private readonly priceListRepository: PriceListRepository) {}

  async execute(input: ListPriceListsUseCaseInput): Promise<PriceListEntity[]> {
    return this.priceListRepository.findAllByCompany(input.companyId, {
      isActive: input.isActive,
    });
  }
}
