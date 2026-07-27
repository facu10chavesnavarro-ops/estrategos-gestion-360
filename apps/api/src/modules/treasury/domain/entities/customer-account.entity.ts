export type CurrentAccountMovementType = 'DEBIT' | 'CREDIT';

export class CustomerAccountEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly customerId: string,
    public readonly currentBalance: string,
  ) {}
}

/** RN-CTA-02/03: inmutable, balanceAfter es snapshot del saldo resultante. */
export class CustomerAccountMovementEntity {
  constructor(
    public readonly id: string,
    public readonly customerAccountId: string,
    public readonly type: CurrentAccountMovementType,
    public readonly amount: string,
    public readonly balanceAfter: string,
    public readonly voucherId: string | null,
    public readonly paymentId: string | null,
    public readonly createdAt: Date,
  ) {}
}
