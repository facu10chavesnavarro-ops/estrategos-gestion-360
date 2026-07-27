import { PaymentDirection } from '../../../treasury/domain/entities/payment.entity';
import { CompanyPaymentMethodAccountEntity } from '../entities/company-payment-method-account.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export abstract class CompanyPaymentMethodAccountRepository {
  abstract upsert(
    input: {
      companyId: string;
      paymentMethodId: string;
      direction: PaymentDirection;
      accountId: string;
    },
    ctx?: TransactionContext,
  ): Promise<CompanyPaymentMethodAccountEntity>;
  abstract find(
    companyId: string,
    paymentMethodId: string,
    direction: PaymentDirection,
    ctx?: TransactionContext,
  ): Promise<CompanyPaymentMethodAccountEntity | null>;
  abstract findAllByCompany(companyId: string): Promise<CompanyPaymentMethodAccountEntity[]>;
}
