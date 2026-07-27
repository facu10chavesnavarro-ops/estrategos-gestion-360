import { Injectable } from '@nestjs/common';
import { CompanyPaymentMethodAccountRepository } from '../../domain/repositories/company-payment-method-account.repository';
import { CompanyPaymentMethodAccountEntity } from '../../domain/entities/company-payment-method-account.entity';

@Injectable()
export class ListPaymentMethodAccountMappingsUseCase {
  constructor(
    private readonly companyPaymentMethodAccountRepository: CompanyPaymentMethodAccountRepository,
  ) {}

  async execute(companyId: string): Promise<CompanyPaymentMethodAccountEntity[]> {
    return this.companyPaymentMethodAccountRepository.findAllByCompany(companyId);
  }
}
