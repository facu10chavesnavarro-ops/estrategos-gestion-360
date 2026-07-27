import { BankAccountType } from '../../domain/entities/bank-account.entity';

export interface CreateBankAccountUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  bankName: string;
  accountType: BankAccountType;
  accountNumber?: string;
  cbu?: string;
  alias?: string;
  currency?: string;
}

export interface UpdateBankAccountUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  bankAccountId: string;
  bankName?: string;
  accountNumber?: string;
  cbu?: string;
  alias?: string;
  glAccountId?: string | null;
}

export interface ChangeBankAccountStateUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  bankAccountId: string;
}

export interface CreateBankMovementUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  bankAccountId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: string;
  description?: string;
  date?: string;
  counterpartAccountId?: string;
}
