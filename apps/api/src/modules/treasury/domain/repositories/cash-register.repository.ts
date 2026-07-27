import { CashRegisterEntity } from '../entities/cash-register.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreateCashRegisterInput {
  companyId: string;
  branchId: string;
  name: string;
}

export interface UpdateCashRegisterInput {
  name?: string;
}

export abstract class CashRegisterRepository {
  abstract create(
    input: CreateCashRegisterInput,
    ctx?: TransactionContext,
  ): Promise<CashRegisterEntity>;
  abstract findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<CashRegisterEntity | null>;
  abstract findAllByBranch(branchId: string): Promise<CashRegisterEntity[]>;
  abstract update(
    id: string,
    input: UpdateCashRegisterInput,
    ctx?: TransactionContext,
  ): Promise<CashRegisterEntity>;
  abstract setActive(
    id: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<CashRegisterEntity>;
}
