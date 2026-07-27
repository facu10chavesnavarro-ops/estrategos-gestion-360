import { Injectable } from '@nestjs/common';
import { CashRegisterRepository } from '../../domain/repositories/cash-register.repository';
import { CashRegisterEntity } from '../../domain/entities/cash-register.entity';
import { CashRegisterNotFoundError } from '../../domain/errors/cash.errors';

@Injectable()
export class GetCashRegisterByIdUseCase {
  constructor(private readonly cashRegisterRepository: CashRegisterRepository) {}

  async execute(cashRegisterId: string, companyId: string): Promise<CashRegisterEntity> {
    const cashRegister = await this.cashRegisterRepository.findById(cashRegisterId, companyId);
    if (!cashRegister) {
      throw new CashRegisterNotFoundError();
    }
    return cashRegister;
  }
}
