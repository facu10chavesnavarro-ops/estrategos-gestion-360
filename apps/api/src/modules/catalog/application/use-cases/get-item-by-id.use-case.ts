import { Injectable } from '@nestjs/common';
import { ItemRepository } from '../../domain/repositories/item.repository';
import { ItemEntity } from '../../domain/entities/item.entity';
import { ItemNotFoundError } from '../../domain/errors/item.errors';

@Injectable()
export class GetItemByIdUseCase {
  constructor(private readonly itemRepository: ItemRepository) {}

  async execute(itemId: string, companyId: string): Promise<ItemEntity> {
    const item = await this.itemRepository.findById(itemId, companyId);
    if (!item) {
      throw new ItemNotFoundError();
    }
    return item;
  }
}
