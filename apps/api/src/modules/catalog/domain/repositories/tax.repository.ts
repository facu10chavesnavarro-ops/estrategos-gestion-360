import { TaxEntity, TaxType } from '../entities/tax.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreateTaxInput {
  companyId: string;
  name: string;
  type: TaxType;
  rate: string;
  validFrom: Date;
  validTo?: Date;
}

export interface ListTaxesFilters {
  onlyCurrentlyValid?: boolean;
}

export abstract class TaxRepository {
  abstract create(input: CreateTaxInput, ctx?: TransactionContext): Promise<TaxEntity>;
  abstract findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<TaxEntity | null>;
  abstract findAllByCompany(
    companyId: string,
    filters: ListTaxesFilters,
  ): Promise<TaxEntity[]>;
  abstract updateName(
    id: string,
    name: string,
    ctx?: TransactionContext,
  ): Promise<TaxEntity>;
  abstract updateAccounts(
    id: string,
    input: { salesAccountId?: string | null; purchasesAccountId?: string | null },
    ctx?: TransactionContext,
  ): Promise<TaxEntity>;
  abstract close(
    id: string,
    validTo: Date,
    ctx?: TransactionContext,
  ): Promise<TaxEntity>;
}
