import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../domain/repositories/customer.repository';
import { CustomerEntity } from '../../domain/entities/customer.entity';
import { CustomerNotFoundError } from '../../domain/errors/customer.errors';

@Injectable()
export class GetCustomerByIdUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(customerId: string, companyId: string): Promise<CustomerEntity> {
    const customer = await this.customerRepository.findById(customerId, companyId);
    if (!customer) {
      throw new CustomerNotFoundError();
    }
    return customer;
  }
}
