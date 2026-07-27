export type BankMovementType = 'DEPOSIT' | 'WITHDRAWAL';

export class BankMovementEntity {
  constructor(
    public readonly id: string,
    public readonly bankAccountId: string,
    public readonly type: BankMovementType,
    public readonly amount: string,
    public readonly paymentId: string | null,
    public readonly description: string | null,
    public readonly date: Date,
    public readonly isReconciled: boolean,
    public readonly reconciledAt: Date | null,
    public readonly createdAt: Date,
  ) {}
}
