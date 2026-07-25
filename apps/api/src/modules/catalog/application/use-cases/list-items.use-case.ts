import { Injectable } from '@nestjs/common';
import { ItemRepository } from '../../domain/repositories/item.repository';
import { ItemEntity } from '../../domain/entities/item.entity';
import { ListItemsUseCaseInput } from '../dto/item.dto';

@Injectable()
export class ListItemsUseCase {
  constructor(private readonly itemRepository: ItemRepository) {}

  async execute(input: ListItemsUseCaseInput): Promise<ItemEntity[]> {
    return this.itemRepository.findAllByCompany(input.companyId, {
      type: input.type,
      categoryId: input.categoryId,
      isActive: input.isActive,
      search: input.search,
    });
  }
}
