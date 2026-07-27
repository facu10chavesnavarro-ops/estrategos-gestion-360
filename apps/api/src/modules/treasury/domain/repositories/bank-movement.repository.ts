import { BankMovementEntity, BankMovementType } from '../entities/bank-movement.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreateBankMovementInput {
  id: string;
  bankAccountId: string;
  type: BankMovementType;
  amount: string;
  paymentId?: string;
  description?: string;
  date: Date;
}

export abstract class BankMovementRepository {
  abstract create(
    input: CreateBankMovementInput,
    ctx?: TransactionContext,
  ): Promise<BankMovementEntity>;
  abstract findAllByAccount(bankAccountId: string): Promise<BankMovementEntity[]>;
}
