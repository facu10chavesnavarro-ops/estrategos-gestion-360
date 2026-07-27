import { AccountingSettingsEntity } from '../entities/accounting-settings.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreateAccountingSettingsInput {
  companyId: string;
  accountsReceivableId: string;
  accountsPayableId: string;
}

export interface UpdateAccountingSettingsInput {
  accountsReceivableId?: string;
  accountsPayableId?: string;
}

export abstract class AccountingSettingsRepository {
  abstract create(
    input: CreateAccountingSettingsInput,
    ctx?: TransactionContext,
  ): Promise<AccountingSettingsEntity>;
  abstract findByCompany(
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<AccountingSettingsEntity | null>;
  abstract update(
    companyId: string,
    input: UpdateAccountingSettingsInput,
    ctx?: TransactionContext,
  ): Promise<AccountingSettingsEntity>;
}
