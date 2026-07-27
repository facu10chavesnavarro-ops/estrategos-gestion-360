import { Injectable } from '@nestjs/common';
import { CashSessionRepository } from '../../domain/repositories/cash-session.repository';
import { CashSessionEntity } from '../../domain/entities/cash-session.entity';

@Injectable()
export class ListCashSessionsUseCase {
  constructor(private readonly cashSessionRepository: CashSessionRepository) {}

  async execute(cashRegisterId: string): Promise<CashSessionEntity[]> {
    return this.cashSessionRepository.findAllByCashRegister(cashRegisterId);
  }
}
