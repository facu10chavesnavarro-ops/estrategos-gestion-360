import { CustomerEntity } from '../entities/customer.entity';

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
  abstract create(input: CreateCustomerInput): Promise<CustomerEntity>;
  abstract findById(id: string, companyId: string): Promise<CustomerEntity | null>;
  abstract findByPartyId(partyId: string): Promise<CustomerEntity | null>;
  abstract findAllByCompany(
    companyId: string,
    filters: ListCustomersFilters,
  ): Promise<CustomerEntity[]>;
  abstract update(id: string, input: UpdateCustomerInput): Promise<CustomerEntity>;
  abstract setActive(id: string, isActive: boolean): Promise<CustomerEntity>;
}
