import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../../customers/domain/repositories/customer.repository';
import { CustomerNotFoundError } from '../../../customers/domain/errors/customer.errors';
import {
  CustomerAccountRepository,
  CustomerAccountMovementRepository,
} from '../../domain/repositories/customer-account.repository';
import { CustomerCurrentAccountView } from '../dto/current-account.dto';

/** RN-CTA-01: si el cliente nunca tuvo un movimiento, no existe fila de cuenta — saldo 0. */
@Injectable()
export class GetCustomerCurrentAccountUseCase {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly customerAccountRepository: CustomerAccountRepository,
    private readonly customerAccountMovementRepository: CustomerAccountMovementRepository,
  ) {}

  async execute(customerId: string, companyId: string): Promise<CustomerCurrentAccountView> {
    const customer = await this.customerRepository.findById(customerId, companyId);
    if (!customer) {
      throw new CustomerNotFoundError();
    }

    const account = await this.customerAccountRepository.findByCustomerId(customerId);
    const movements = account
      ? await this.customerAccountMovementRepository.findAllByAccount(account.id)
      : [];

    return {
      customerId,
      currentBalance: account?.currentBalance ?? '0.00',
      movements,
    };
  }
}
