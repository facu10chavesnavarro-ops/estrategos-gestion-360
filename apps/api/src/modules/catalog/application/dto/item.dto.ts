import { ItemType } from '../../domain/entities/item.entity';
import { ImportMode } from '../../../../common/domain/import/import.types';

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
  longDescription?: string;
  barcode?: string;
  costPrice?: string;
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
  longDescription?: string | null;
  barcode?: string | null;
  costPrice?: string | null;
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

export interface ImportItemsUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  csvContent: string;
  mode: ImportMode;
}
