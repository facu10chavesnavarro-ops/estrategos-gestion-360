import { CustomerEntity } from '../entities/customer.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreateCustomerInput {
  partyId: string;
  companyId: string;
  paymentTermDays?: number;
  creditLimit?: string;
}

export interface UpdateCustomerInput {
  paymentTermDays?: number;
  creditLimit?: string;
}

export interface ListCustomersFilters {
  search?: string;
  isActive?: boolean;
}

export abstract class CustomerRepository {
  abstract create(input: CreateCustomerInput, ctx?: TransactionContext): Promise<CustomerEntity>;
  abstract findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<CustomerEntity | null>;
  abstract findByPartyId(
    partyId: string,
    ctx?: TransactionContext,
  ): Promise<CustomerEntity | null>;
  abstract findAllByCompany(
    companyId: string,
    filters: ListCustomersFilters,
  ): Promise<CustomerEntity[]>;
  abstract update(
    id: string,
    input: UpdateCustomerInput,
    ctx?: TransactionContext,
  ): Promise<CustomerEntity>;
  abstract setActive(
    id: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<CustomerEntity>;
}
