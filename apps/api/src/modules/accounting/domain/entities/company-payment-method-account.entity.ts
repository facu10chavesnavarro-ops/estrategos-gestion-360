import { PaymentDirection } from '../../../treasury/domain/entities/payment.entity';

export class CompanyPaymentMethodAccountEntity {
  constructor(
    public readonly companyId: string,
    public readonly paymentMethodId: string,
    public readonly direction: PaymentDirection,
    public readonly accountId: string,
  ) {}
}
