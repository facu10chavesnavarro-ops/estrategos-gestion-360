import { Injectable } from '@nestjs/common';
import { CashMovementRepository } from '../../domain/repositories/cash-movement.repository';
import { CashMovementEntity, CashMovementType } from '../../domain/entities/cash-movement.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { uuidv7 } from '../../../../common/infrastructure/id/uuid-v7';

export interface ApplyCashMovementInput {
  cashSessionId: string;
  type: CashMovementType;
  amount: string;
  paymentId?: string;
  reason?: string;
}

/**
 * Registra un movimiento de caja contra una sesión ya validada como
 * abierta por el caller (RN-CASH-06) — no vuelve a abrir ni a verificar
 * la sesión, solo crea el movimiento. Recibe `ctx` en vez de abrir su
 * propia transacción, mismo principio que `ApplyStockMovementService`/
 * `ApplyCustomerAccountMovementService`, para que `CreatePaymentUseCase`
 * pueda combinarlo con el resto de sus escrituras de forma atómica.
 */
@Injectable()
export class ApplyCashMovementService {
  constructor(private readonly cashMovementRepository: CashMovementRepository) {}

  async apply(
    input: ApplyCashMovementInput,
    ctx: TransactionContext,
  ): Promise<CashMovementEntity> {
    return this.cashMovementRepository.create(
      {
        id: uuidv7(),
        cashSessionId: input.cashSessionId,
        type: input.type,
        amount: input.amount,
        paymentId: input.paymentId,
        reason: input.reason,
      },
      ctx,
    );
  }
}
