import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../domain/repositories/customer.repository';
import { CustomerEntity } from '../../domain/entities/customer.entity';
import { ListCustomersUseCaseInput } from '../dto/customer.dto';

@Injectable()
export class ListCustomersUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(input: ListCustomersUseCaseInput): Promise<CustomerEntity[]> {
    return this.customerRepository.findAllByCompany(input.companyId, {
      search: input.search,
      isActive: input.isActive,
    });
  }
}
