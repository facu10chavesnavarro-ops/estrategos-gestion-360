import { Injectable } from '@nestjs/common';
import { CashMovementRepository } from '../../domain/repositories/cash-movement.repository';
import { CashMovementEntity } from '../../domain/entities/cash-movement.entity';

@Injectable()
export class ListCashMovementsUseCase {
  constructor(private readonly cashMovementRepository: CashMovementRepository) {}

  async execute(cashSessionId: string, companyId: string): Promise<CashMovementEntity[]> {
    return this.cashMovementRepository.findAllBySession(cashSessionId, companyId);
  }
}
