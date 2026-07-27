import { Injectable } from '@nestjs/common';
import { CashRegisterRepository } from '../../domain/repositories/cash-register.repository';
import { CashRegisterEntity } from '../../domain/entities/cash-register.entity';

@Injectable()
export class ListCashRegistersUseCase {
  constructor(private readonly cashRegisterRepository: CashRegisterRepository) {}

  async execute(branchId: string): Promise<CashRegisterEntity[]> {
    return this.cashRegisterRepository.findAllByBranch(branchId);
  }
}
