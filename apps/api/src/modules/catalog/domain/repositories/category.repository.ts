import { CategoryEntity } from '../entities/category.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreateCategoryInput {
  companyId: string;
  parentId?: string;
  name: string;
}

export interface UpdateCategoryInput {
  parentId?: string | null;
  name?: string;
}

export interface ListCategoriesFilters {
  isActive?: boolean;
}

export abstract class CategoryRepository {
  abstract create(
    input: CreateCategoryInput,
    ctx?: TransactionContext,
  ): Promise<CategoryEntity>;
  abstract findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<CategoryEntity | null>;
  abstract findAllByCompany(
    companyId: string,
    filters: ListCategoriesFilters,
  ): Promise<CategoryEntity[]>;
  abstract update(
    id: string,
    input: UpdateCategoryInput,
    ctx?: TransactionContext,
  ): Promise<CategoryEntity>;
  abstract setActive(
    id: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<CategoryEntity>;
}
