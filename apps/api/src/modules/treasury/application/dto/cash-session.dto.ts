export interface OpenCashSessionUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  cashRegisterId: string;
  openingBalance: string;
}

export interface CloseCashSessionUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  cashSessionId: string;
  closingBalance: string;
}

export interface CreateCashMovementUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  cashSessionId: string;
  type: 'IN' | 'OUT';
  amount: string;
  reason?: string;
  counterpartAccountId?: string;
}
