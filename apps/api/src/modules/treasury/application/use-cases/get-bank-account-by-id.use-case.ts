import { Injectable } from '@nestjs/common';
import { BankAccountRepository } from '../../domain/repositories/bank-account.repository';
import { BankAccountEntity } from '../../domain/entities/bank-account.entity';
import { BankAccountNotFoundError } from '../../domain/errors/bank.errors';

@Injectable()
export class GetBankAccountByIdUseCase {
  constructor(private readonly bankAccountRepository: BankAccountRepository) {}

  async execute(bankAccountId: string, companyId: string): Promise<BankAccountEntity> {
    const bankAccount = await this.bankAccountRepository.findById(bankAccountId, companyId);
    if (!bankAccount) {
      throw new BankAccountNotFoundError();
    }
    return bankAccount;
  }
}
