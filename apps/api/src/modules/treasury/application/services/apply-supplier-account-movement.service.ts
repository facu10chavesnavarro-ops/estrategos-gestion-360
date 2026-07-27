import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { SupplierAccountRepository, SupplierAccountMovementRepository } from '../../domain/repositories/supplier-account.repository';
import { SupplierAccountMovementEntity } from '../../domain/entities/supplier-account.entity';
import { CurrentAccountMovementType } from '../../domain/entities/customer-account.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { uuidv7 } from '../../../../common/infrastructure/id/uuid-v7';

export interface ApplySupplierAccountMovementInput {
  companyId: string;
  supplierId: string;
  type: CurrentAccountMovementType;
  amount: string;
  voucherId?: string;
  paymentId?: string;
}

/** Análogo a ApplyCustomerAccountMovementService — ver esa clase para el detalle. */
@Injectable()
export class ApplySupplierAccountMovementService {
  constructor(
    private readonly supplierAccountRepository: SupplierAccountRepository,
    private readonly supplierAccountMovementRepository: SupplierAccountMovementRepository,
  ) {}

  async apply(
    input: ApplySupplierAccountMovementInput,
    ctx: TransactionContext,
  ): Promise<SupplierAccountMovementEntity> {
    const existing = await this.supplierAccountRepository.findBySupplierId(
      input.supplierId,
      ctx,
    );
    const currentBalance = existing ? new Decimal(existing.currentBalance) : new Decimal(0);
    const amount = new Decimal(input.amount);
    const newBalance =
      input.type === 'DEBIT' ? currentBalance.plus(amount) : currentBalance.minus(amount);

    const account = await this.supplierAccountRepository.upsert(
      {
        companyId: input.companyId,
        supplierId: input.supplierId,
        currentBalance: newBalance.toFixed(2),
      },
      ctx,
    );

    return this.supplierAccountMovementRepository.create(
      {
        id: uuidv7(),
        supplierAccountId: account.id,
        type: input.type,
        amount: amount.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        voucherId: input.voucherId,
        paymentId: input.paymentId,
      },
      ctx,
    );
  }
}
