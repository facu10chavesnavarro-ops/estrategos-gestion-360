export interface CreateVoucherLineUseCaseInput {
  itemId?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountPercentage?: string;
}

export interface CreateVoucherUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  branchId: string;
  pointOfSaleId: string;
  voucherTypeId: string;
  partyId: string;
  warehouseId?: string;
  issueDate?: string;
  currency?: string;
  exchangeRate?: string;
  relatedVoucherId?: string;
  lines: CreateVoucherLineUseCaseInput[];
}

export interface ListVouchersUseCaseInput {
  companyId: string;
  partyId?: string;
  voucherTypeId?: string;
  from?: string;
  to?: string;
}
