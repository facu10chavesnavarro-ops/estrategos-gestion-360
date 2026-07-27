import { PaymentEntity, PaymentDirection } from '../entities/payment.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreateCheckDetailInput {
  number: string;
  bankName: string;
  dueDate: Date;
}

export interface CreateCardDetailInput {
  authorizationCode?: string;
  batchNumber?: string;
  settlementEntity?: string;
}

export interface CreatePaymentMethodDetailInput {
  id: string;
  paymentMethodId: string;
  amount: string;
  reference?: string;
  checkDetail?: CreateCheckDetailInput;
  cardDetail?: CreateCardDetailInput;
}

export interface CreatePaymentAllocationInput {
  id: string;
  voucherId: string;
  amountApplied: string;
}

export interface CreatePaymentInput {
  id: string;
  companyId: string;
  partyId: string;
  direction: PaymentDirection;
  date: Date;
  currency: string;
  exchangeRate: string;
  totalAmount: string;
  createdByUserId: string;
  allocations: CreatePaymentAllocationInput[];
  methodDetails: CreatePaymentMethodDetailInput[];
}

export interface ListPaymentsFilters {
  partyId?: string;
  direction?: PaymentDirection;
  from?: Date;
  to?: Date;
}

export abstract class PaymentRepository {
  abstract create(input: CreatePaymentInput, ctx?: TransactionContext): Promise<PaymentEntity>;
  abstract findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<PaymentEntity | null>;
  abstract findAllByCompany(
    companyId: string,
    filters: ListPaymentsFilters,
  ): Promise<PaymentEntity[]>;
  /** RN-PAY-05: suma de amountApplied ya imputada a este comprobante, a través de todos los pagos. */
  abstract sumAllocatedAmountForVoucher(
    voucherId: string,
    ctx?: TransactionContext,
  ): Promise<string>;
}
