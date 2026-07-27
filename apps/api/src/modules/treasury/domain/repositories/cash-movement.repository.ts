import { CashMovementEntity, CashMovementType } from '../entities/cash-movement.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreateCashMovementInput {
  id: string;
  cashSessionId: string;
  type: CashMovementType;
  amount: string;
  paymentId?: string;
  reason?: string;
}

export abstract class CashMovementRepository {
  abstract create(
    input: CreateCashMovementInput,
    ctx?: TransactionContext,
  ): Promise<CashMovementEntity>;
  abstract findAllBySession(cashSessionId: string): Promise<CashMovementEntity[]>;
  abstract sumAmountBySessionAndType(
    cashSessionId: string,
    type: CashMovementType,
    ctx?: TransactionContext,
  ): Promise<string>;
}
