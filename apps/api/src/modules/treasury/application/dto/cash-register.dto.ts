export interface CreateCashRegisterUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  branchId: string;
  name: string;
}

export interface UpdateCashRegisterUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  cashRegisterId: string;
  name?: string;
  accountId?: string | null;
}

export interface ChangeCashRegisterStateUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  cashRegisterId: string;
}
