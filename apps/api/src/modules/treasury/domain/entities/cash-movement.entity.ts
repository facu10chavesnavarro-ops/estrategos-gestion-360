export type CashMovementType = 'IN' | 'OUT';

export class CashMovementEntity {
  constructor(
    public readonly id: string,
    public readonly cashSessionId: string,
    public readonly type: CashMovementType,
    public readonly amount: string,
    public readonly paymentId: string | null,
    public readonly reason: string | null,
    public readonly createdAt: Date,
  ) {}
}
