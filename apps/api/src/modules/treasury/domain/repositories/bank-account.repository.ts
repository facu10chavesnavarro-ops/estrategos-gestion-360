import { BankAccountEntity, BankAccountType } from '../entities/bank-account.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreateBankAccountInput {
  companyId: string;
  bankName: string;
  accountType: BankAccountType;
  accountNumber?: string;
  cbu?: string;
  alias?: string;
  currency: string;
}

export interface UpdateBankAccountInput {
  bankName?: string;
  accountNumber?: string;
  cbu?: string;
  alias?: string;
  glAccountId?: string | null;
}

export abstract class BankAccountRepository {
  abstract create(
    input: CreateBankAccountInput,
    ctx?: TransactionContext,
  ): Promise<BankAccountEntity>;
  abstract findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<BankAccountEntity | null>;
  abstract findAllByCompany(companyId: string): Promise<BankAccountEntity[]>;
  abstract update(
    id: string,
    input: UpdateBankAccountInput,
    ctx?: TransactionContext,
  ): Promise<BankAccountEntity>;
  abstract setActive(
    id: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<BankAccountEntity>;
}
