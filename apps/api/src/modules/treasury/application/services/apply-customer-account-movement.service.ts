import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { CustomerAccountRepository, CustomerAccountMovementRepository } from '../../domain/repositories/customer-account.repository';
import {
  CustomerAccountMovementEntity,
  CurrentAccountMovementType,
} from '../../domain/entities/customer-account.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { uuidv7 } from '../../../../common/infrastructure/id/uuid-v7';

export interface ApplyCustomerAccountMovementInput {
  companyId: string;
  customerId: string;
  type: CurrentAccountMovementType;
  amount: string;
  voucherId?: string;
  paymentId?: string;
}

/**
 * Aplica un movimiento de cuenta corriente de Cliente (RN-CTA-01/02/03):
 * crea la cuenta en 0 si no existe (upsert), recalcula el saldo con la
 * convención de signo unificada (DEBIT aumenta, CREDIT disminuye) y
 * registra el movimiento con `balanceAfter` como snapshot. Recibe el
 * `ctx` en vez de abrir su propia transacción — mismo principio que
 * `ApplyStockMovementService` (Sprint 3.3).
 */
@Injectable()
export class ApplyCustomerAccountMovementService {
  constructor(
    private readonly customerAccountRepository: CustomerAccountRepository,
    private readonly customerAccountMovementRepository: CustomerAccountMovementRepository,
  ) {}

  async apply(
    input: ApplyCustomerAccountMovementInput,
    ctx: TransactionContext,
  ): Promise<CustomerAccountMovementEntity> {
    const existing = await this.customerAccountRepository.findByCustomerId(
      input.customerId,
      ctx,
    );
    const currentBalance = existing ? new Decimal(existing.currentBalance) : new Decimal(0);
    const amount = new Decimal(input.amount);
    const newBalance =
      input.type === 'DEBIT' ? currentBalance.plus(amount) : currentBalance.minus(amount);

    const account = await this.customerAccountRepository.upsert(
      {
        companyId: input.companyId,
        customerId: input.customerId,
        currentBalance: newBalance.toFixed(2),
      },
      ctx,
    );

    return this.customerAccountMovementRepository.create(
      {
        id: uuidv7(),
        customerAccountId: account.id,
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
