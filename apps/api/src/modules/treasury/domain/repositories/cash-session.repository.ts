import { CashSessionEntity } from '../entities/cash-session.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface OpenCashSessionInput {
  cashRegisterId: string;
  openedByUserId: string;
  openingBalance: string;
}

export interface CloseCashSessionInput {
  closedByUserId: string;
  closingBalance: string;
  expectedBalance: string;
  difference: string;
}

export abstract class CashSessionRepository {
  abstract create(
    input: OpenCashSessionInput,
    ctx?: TransactionContext,
  ): Promise<CashSessionEntity>;
  abstract findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<CashSessionEntity | null>;
  abstract findOpenByCashRegister(
    cashRegisterId: string,
    ctx?: TransactionContext,
  ): Promise<CashSessionEntity | null>;
  abstract findAllByCashRegister(cashRegisterId: string): Promise<CashSessionEntity[]>;
  abstract close(
    id: string,
    input: CloseCashSessionInput,
    ctx?: TransactionContext,
  ): Promise<CashSessionEntity>;
}
