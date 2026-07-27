import { AccountType, ChartOfAccountEntity } from '../entities/chart-of-account.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreateChartOfAccountInput {
  companyId: string;
  parentId?: string;
  code: string;
  name: string;
  type: AccountType;
  allowsMovements?: boolean;
  isSystemAccount?: boolean;
}

export interface UpdateChartOfAccountInput {
  parentId?: string | null;
  name?: string;
}

export interface ListChartOfAccountsFilters {
  isActive?: boolean;
}

export abstract class ChartOfAccountRepository {
  abstract create(
    input: CreateChartOfAccountInput,
    ctx?: TransactionContext,
  ): Promise<ChartOfAccountEntity>;
  abstract findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<ChartOfAccountEntity | null>;
  abstract findByCode(
    companyId: string,
    code: string,
    ctx?: TransactionContext,
  ): Promise<ChartOfAccountEntity | null>;
  abstract findAllByCompany(
    companyId: string,
    filters: ListChartOfAccountsFilters,
  ): Promise<ChartOfAccountEntity[]>;
  abstract update(
    id: string,
    input: UpdateChartOfAccountInput,
    ctx?: TransactionContext,
  ): Promise<ChartOfAccountEntity>;
  abstract setActive(
    id: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<ChartOfAccountEntity>;
}
