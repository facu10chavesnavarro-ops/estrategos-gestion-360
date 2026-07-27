export interface CreatePointOfSaleUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  branchId: string;
  code: string;
  name: string;
}

export interface UpdatePointOfSaleUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  pointOfSaleId: string;
  name?: string;
}

export interface ChangePointOfSaleStateUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  pointOfSaleId: string;
}
