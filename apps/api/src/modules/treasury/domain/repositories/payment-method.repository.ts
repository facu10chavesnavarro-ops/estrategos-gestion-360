import { PaymentMethodEntity } from '../entities/payment-method.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

/** Catálogo global de plataforma (como VoucherType/Role). */
export abstract class PaymentMethodRepository {
  abstract findById(id: string, ctx?: TransactionContext): Promise<PaymentMethodEntity | null>;
  abstract findAllActive(): Promise<PaymentMethodEntity[]>;
}
