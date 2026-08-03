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
  /** RN-PAY-10: obligatorio si algún medio requiere movimiento de caja. */
  cashSessionId?: string;
  /** RN-PAY-10: obligatorio si algún medio requiere movimiento bancario. */
  bankAccountId?: string;
  /**
   * RN-PAY-11 (Sprint F6): si se informa y ya existe un Payment con la
   * misma (companyId, idempotencyKey), se devuelve ese Payment tal cual
   * en vez de crear uno nuevo — protege contra doble-submit/reintentos
   * de red sin depender solo del frontend.
   */
  idempotencyKey?: string;
}

export interface ListPaymentsUseCaseInput {
  companyId: string;
  partyId?: string;
  direction?: PaymentDirection;
  from?: string;
  to?: string;
}
