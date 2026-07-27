import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { BankAccountRepository } from '../../domain/repositories/bank-account.repository';
import { ApplyBankMovementService } from '../services/apply-bank-movement.service';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { BankMovementEntity } from '../../domain/entities/bank-movement.entity';
import { CreateBankMovementUseCaseInput } from '../dto/bank-account.dto';
import {
  BankAccountNotFoundError,
  MissingBankMovementDescriptionError,
  InvalidBankMovementAmountError,
} from '../../domain/errors/bank.errors';

/**
 * Movimiento manual de banco (RN-BANK-03/04) — sin `paymentId`, por eso
 * exige `description`. Los movimientos que vienen de un `Payment` se
 * crean desde `CreatePaymentUseCase`, no desde acá.
 */
@Injectable()
export class CreateBankMovementUseCase {
  constructor(
    private readonly bankAccountRepository: BankAccountRepository,
    private readonly applyBankMovementService: ApplyBankMovementService,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: CreateBankMovementUseCaseInput): Promise<BankMovementEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    if (!input.description) {
      throw new MissingBankMovementDescriptionError();
    }
    if (!(new Decimal(input.amount).greaterThan(0))) {
      throw new InvalidBankMovementAmountError();
    }

    const bankAccount = await this.bankAccountRepository.findById(
      input.bankAccountId,
      input.companyId,
    );
    if (!bankAccount) {
      throw new BankAccountNotFoundError();
    }

    return this.unitOfWork.run(async (ctx) => {
      const movement = await this.applyBankMovementService.apply(
        {
          bankAccountId: input.bankAccountId,
          type: input.type,
          amount: new Decimal(input.amount).toFixed(2),
          description: input.description,
          date: input.date ? new Date(input.date) : undefined,
        },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: input.type === 'DEPOSIT' ? 'bank_movement.deposit' : 'bank_movement.withdrawal',
          entityType: 'BankMovement',
          entityId: movement.id,
          metadata: {
            bankAccountId: input.bankAccountId,
            amount: movement.amount,
            description: input.description,
          },
        },
        ctx,
      );

      return movement;
    });
  }
}
