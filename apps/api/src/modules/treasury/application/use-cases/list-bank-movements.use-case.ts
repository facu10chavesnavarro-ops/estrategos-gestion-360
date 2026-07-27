import { Injectable } from '@nestjs/common';
import { BankMovementRepository } from '../../domain/repositories/bank-movement.repository';
import { BankMovementEntity } from '../../domain/entities/bank-movement.entity';

@Injectable()
export class ListBankMovementsUseCase {
  constructor(private readonly bankMovementRepository: BankMovementRepository) {}

  async execute(bankAccountId: string): Promise<BankMovementEntity[]> {
    return this.bankMovementRepository.findAllByAccount(bankAccountId);
  }
}
