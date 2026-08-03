export type PaymentDirection = 'COLLECTION' | 'PAYMENT';
export type CheckStatus = 'EN_CARTERA' | 'DEPOSITADO' | 'RECHAZADO' | 'COBRADO';

export interface CheckDetailData {
  readonly id: string;
  readonly number: string;
  readonly bankName: string;
  readonly dueDate: Date;
  readonly status: CheckStatus;
}

export interface CardDetailData {
  readonly id: string;
  readonly authorizationCode: string | null;
  readonly batchNumber: string | null;
  readonly settlementEntity: string | null;
}

export interface PaymentMethodDetailData {
  readonly id: string;
  readonly paymentMethodId: string;
  readonly amount: string;
  readonly reference: string | null;
  readonly checkDetail: CheckDetailData | null;
  readonly cardDetail: CardDetailData | null;
}

export interface PaymentAllocationData {
  readonly voucherId: string;
  readonly amountApplied: string;
}

/** RN-PAY-01 a 10. Inmutable una vez creado (RN-PAY-06). */
export class PaymentEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly partyId: string,
    public readonly direction: PaymentDirection,
    public readonly date: Date,
    public readonly currency: string,
    public readonly exchangeRate: string,
    public readonly totalAmount: string,
    public readonly createdByUserId: string,
    public readonly createdAt: Date,
    public readonly allocations: PaymentAllocationData[],
    public readonly methodDetails: PaymentMethodDetailData[],
    /**
     * RN-PAY-11 (Sprint F6, frontend): clave de idempotencia opcional
     * generada por el cliente. Si un segundo POST llega con la misma
     * (companyId, idempotencyKey), CreatePaymentUseCase devuelve este
     * mismo Payment ya creado en vez de duplicarlo — ver
     * docs/frontend/09-sprint-f6-tesoreria.md §3.1.
     */
    public readonly idempotencyKey: string | null = null,
  ) {}
}
