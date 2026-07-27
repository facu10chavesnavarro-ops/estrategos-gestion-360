export class PaymentMethodEntity {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly name: string,
    public readonly requiresCheckDetail: boolean,
    public readonly requiresCardDetail: boolean,
    public readonly requiresCashMovement: boolean,
    public readonly requiresBankMovement: boolean,
    public readonly isActive: boolean,
  ) {}
}
