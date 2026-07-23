export interface CreateBranchUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  name: string;
  address?: string;
  phone?: string;
}

export interface UpdateBranchUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  branchId: string;
  name?: string;
  address?: string;
  phone?: string;
}

export interface ChangeBranchStateUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  branchId: string;
  reason?: string;
}
