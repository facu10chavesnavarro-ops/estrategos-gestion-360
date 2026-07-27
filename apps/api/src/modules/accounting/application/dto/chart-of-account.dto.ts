import { AccountType } from '../../domain/entities/chart-of-account.entity';

export interface CreateChartOfAccountUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  parentId?: string;
  code: string;
  name: string;
  type: AccountType;
  allowsMovements?: boolean;
}

export interface UpdateChartOfAccountUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  accountId: string;
  parentId?: string | null;
  name?: string;
}

export interface ChangeChartOfAccountStateUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  accountId: string;
}

export interface ListChartOfAccountsUseCaseInput {
  companyId: string;
  isActive?: boolean;
}
