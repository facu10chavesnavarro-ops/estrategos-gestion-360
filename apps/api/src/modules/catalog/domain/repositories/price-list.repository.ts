import { PriceListEntity, PriceListItemEntity } from '../entities/price-list.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreatePriceListInput {
  companyId: string;
  name: string;
  currency: string;
  isDefault: boolean;
  validFrom?: Date;
  validTo?: Date;
}

export interface UpdatePriceListInput {
  name?: string;
  currency?: string;
  isDefault?: boolean;
  validFrom?: Date;
  validTo?: Date | null;
}

export interface ListPriceListsFilters {
  isActive?: boolean;
}

export abstract class PriceListRepository {
  abstract create(
    input: CreatePriceListInput,
    ctx?: TransactionContext,
  ): Promise<PriceListEntity>;
  abstract findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<PriceListEntity | null>;
  abstract findAllByCompany(
    companyId: string,
    filters: ListPriceListsFilters,
  ): Promise<PriceListEntity[]>;
  abstract update(
    id: string,
    input: UpdatePriceListInput,
    ctx?: TransactionContext,
  ): Promise<PriceListEntity>;
  abstract setActive(
    id: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<PriceListEntity>;
  /** RN-CAT-13: desmarca cualquier otra lista `isDefault=true` de la empresa. */
  abstract clearDefaultForCompany(
    companyId: string,
    exceptId: string | undefined,
    ctx?: TransactionContext,
  ): Promise<void>;

  abstract findItem(
    priceListId: string,
    itemId: string,
    ctx?: TransactionContext,
  ): Promise<PriceListItemEntity | null>;
  abstract listItems(
    priceListId: string,
    ctx?: TransactionContext,
  ): Promise<PriceListItemEntity[]>;
  abstract upsertItem(
    priceListId: string,
    itemId: string,
    price: string,
    ctx?: TransactionContext,
  ): Promise<PriceListItemEntity>;
  abstract removeItem(
    priceListId: string,
    itemId: string,
    ctx?: TransactionContext,
  ): Promise<void>;
}
