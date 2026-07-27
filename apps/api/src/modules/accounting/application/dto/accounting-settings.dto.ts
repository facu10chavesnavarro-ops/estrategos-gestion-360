export interface ActivateAccountingUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
}

export interface UpdateAccountingSettingsUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  accountsReceivableId?: string;
  accountsPayableId?: string;
}

export interface SetPaymentMethodAccountMappingUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  paymentMethodId: string;
  direction: 'COLLECTION' | 'PAYMENT';
  accountId: string;
}
