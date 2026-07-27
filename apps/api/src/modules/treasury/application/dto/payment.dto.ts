import { PaymentDirection } from '../../domain/entities/payment.entity';

export interface CreateCheckDetailUseCaseInput {
  number: string;
  bankName: string;
  dueDate: string;
}

export interface CreateCardDetailUseCaseInput {
  authorizationCode?: string;
  batchNumber?: string;
  settlementEntity?: string;
}

export interface CreatePaymentMethodDetailUseCaseInput {
  paymentMethodId: string;
  amount: string;
  reference?: string;
  checkDetail?: CreateCheckDetailUseCaseInput;
  cardDetail?: CreateCardDetailUseCaseInput;
}

export interface CreatePaymentAllocationUseCaseInput {
  voucherId: string;
  amountApplied: string;
}

export interface CreatePaymentUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  partyId: string;
  direction: PaymentDirection;
  date?: string;
  currency?: string;
  exchangeRate?: string;
  methodDetails: CreatePaymentMethodDetailUseCaseInput[];
  allocations?: CreatePaymentAllocationUseCaseInput[];
}

export interface ListPaymentsUseCaseInput {
  companyId: string;
  partyId?: string;
  direction?: PaymentDirection;
  from?: string;
  to?: string;
}
