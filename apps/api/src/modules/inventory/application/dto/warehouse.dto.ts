export interface CreateWarehouseUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  branchId: string;
  name: string;
}

export interface UpdateWarehouseUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  warehouseId: string;
  name?: string;
}

export interface ChangeWarehouseStateUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  warehouseId: string;
}
