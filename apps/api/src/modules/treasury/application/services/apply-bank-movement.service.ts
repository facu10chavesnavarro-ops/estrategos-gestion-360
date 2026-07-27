import { Injectable } from '@nestjs/common';
import { BankMovementRepository } from '../../domain/repositories/bank-movement.repository';
import { BankMovementEntity, BankMovementType } from '../../domain/entities/bank-movement.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { uuidv7 } from '../../../../common/infrastructure/id/uuid-v7';

export interface ApplyBankMovementInput {
  bankAccountId: string;
  type: BankMovementType;
  amount: string;
  paymentId?: string;
  description?: string;
  date?: Date;
}

/** Análogo a ApplyCashMovementService — ver esa clase para el detalle. */
@Injectable()
export class ApplyBankMovementService {
  constructor(private readonly bankMovementRepository: BankMovementRepository) {}

  async apply(
    input: ApplyBankMovementInput,
    ctx: TransactionContext,
  ): Promise<BankMovementEntity> {
    return this.bankMovementRepository.create(
      {
        id: uuidv7(),
        bankAccountId: input.bankAccountId,
        type: input.type,
        amount: input.amount,
        paymentId: input.paymentId,
        description: input.description,
        date: input.date ?? new Date(),
      },
      ctx,
    );
  }
}
