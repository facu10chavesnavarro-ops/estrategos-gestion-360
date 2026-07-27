import { CustomerAccountEntity, CustomerAccountMovementEntity } from '../entities/customer-account.entity';
import { CurrentAccountMovementType } from '../entities/customer-account.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface UpsertCustomerAccountInput {
  companyId: string;
  customerId: string;
  currentBalance: string;
}

export abstract class CustomerAccountRepository {
  abstract findByCustomerId(
    customerId: string,
    ctx?: TransactionContext,
  ): Promise<CustomerAccountEntity | null>;
  abstract upsert(
    input: UpsertCustomerAccountInput,
    ctx?: TransactionContext,
  ): Promise<CustomerAccountEntity>;
}

export interface CreateCustomerAccountMovementInput {
  id: string;
  customerAccountId: string;
  type: CurrentAccountMovementType;
  amount: string;
  balanceAfter: string;
  voucherId?: string;
  paymentId?: string;
}

export abstract class CustomerAccountMovementRepository {
  abstract create(
    input: CreateCustomerAccountMovementInput,
    ctx?: TransactionContext,
  ): Promise<CustomerAccountMovementEntity>;
  abstract findAllByAccount(customerAccountId: string): Promise<CustomerAccountMovementEntity[]>;
}
