import { Injectable } from '@nestjs/common';
import { BankAccountRepository } from '../../domain/repositories/bank-account.repository';
import { BankAccountEntity } from '../../domain/entities/bank-account.entity';

@Injectable()
export class ListBankAccountsUseCase {
  constructor(private readonly bankAccountRepository: BankAccountRepository) {}

  async execute(companyId: string): Promise<BankAccountEntity[]> {
    return this.bankAccountRepository.findAllByCompany(companyId);
  }
}
