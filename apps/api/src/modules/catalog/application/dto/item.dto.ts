import { ItemType } from '../../domain/entities/item.entity';

export interface CreateItemUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  type: ItemType;
  sku: string;
  name: string;
  description?: string;
  categoryId?: string;
  unitOfMeasure: string;
  tracksStock?: boolean;
  minimumStock?: string;
  taxIds?: string[];
}

export interface UpdateItemUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  itemId: string;
  sku?: string;
  name?: string;
  description?: string;
  categoryId?: string | null;
  unitOfMeasure?: string;
  tracksStock?: boolean;
  minimumStock?: string | null;
  taxIds?: string[];
}

export interface ChangeItemStateUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  itemId: string;
}

export interface ListItemsUseCaseInput {
  companyId: string;
  type?: ItemType;
  categoryId?: string;
  isActive?: boolean;
  search?: string;
}
