import { SupplierAccountEntity, SupplierAccountMovementEntity } from '../entities/supplier-account.entity';
import { CurrentAccountMovementType } from '../entities/customer-account.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface UpsertSupplierAccountInput {
  companyId: string;
  supplierId: string;
  currentBalance: string;
}

export abstract class SupplierAccountRepository {
  abstract findBySupplierId(
    supplierId: string,
    ctx?: TransactionContext,
  ): Promise<SupplierAccountEntity | null>;
  abstract upsert(
    input: UpsertSupplierAccountInput,
    ctx?: TransactionContext,
  ): Promise<SupplierAccountEntity>;
}

export interface CreateSupplierAccountMovementInput {
  id: string;
  supplierAccountId: string;
  type: CurrentAccountMovementType;
  amount: string;
  balanceAfter: string;
  voucherId?: string;
  paymentId?: string;
}

export abstract class SupplierAccountMovementRepository {
  abstract create(
    input: CreateSupplierAccountMovementInput,
    ctx?: TransactionContext,
  ): Promise<SupplierAccountMovementEntity>;
  abstract findAllByAccount(supplierAccountId: string): Promise<SupplierAccountMovementEntity[]>;
}
