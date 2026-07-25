import { ItemEntity, ItemType } from '../entities/item.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreateItemInput {
  companyId: string;
  type: ItemType;
  sku: string;
  name: string;
  description?: string;
  categoryId?: string;
  unitOfMeasure: string;
  tracksStock: boolean;
  minimumStock?: string;
  taxIds: string[];
}

export interface UpdateItemInput {
  sku?: string;
  name?: string;
  description?: string;
  categoryId?: string | null;
  unitOfMeasure?: string;
  tracksStock?: boolean;
  minimumStock?: string | null;
  taxIds?: string[];
}

export interface ListItemsFilters {
  type?: ItemType;
  categoryId?: string;
  isActive?: boolean;
  search?: string;
}

export abstract class ItemRepository {
  abstract create(input: CreateItemInput, ctx?: TransactionContext): Promise<ItemEntity>;
  abstract findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<ItemEntity | null>;
  abstract findBySku(
    companyId: string,
    sku: string,
    ctx?: TransactionContext,
  ): Promise<ItemEntity | null>;
  abstract findAllByCompany(
    companyId: string,
    filters: ListItemsFilters,
  ): Promise<ItemEntity[]>;
  abstract update(
    id: string,
    input: UpdateItemInput,
    ctx?: TransactionContext,
  ): Promise<ItemEntity>;
  abstract setActive(
    id: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<ItemEntity>;
}
