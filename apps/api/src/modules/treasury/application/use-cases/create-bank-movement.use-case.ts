import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { BankAccountRepository } from '../../domain/repositories/bank-account.repository';
import { ApplyBankMovementService } from '../services/apply-bank-movement.service';
import { AccountingSettingsRepository } from '../../../accounting/domain/repositories/accounting-settings.repository';
import { ApplyJournalEntryService } from '../../../accounting/application/services/apply-journal-entry.service';
import {
  MissingBankAccountMappingError,
  MissingCounterpartAccountError,
} from '../../../accounting/domain/errors/accounting.errors';
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
 * crean desde `CreatePaymentUseCase`, no desde acá. Sprint 4 (RN-ACC-06):
 * con Contabilidad activa, exige además `counterpartAccountId` y genera
 * su propio asiento.
 */
@Injectable()
export class CreateBankMovementUseCase {
  constructor(
    private readonly bankAccountRepository: BankAccountRepository,
    private readonly applyBankMovementService: ApplyBankMovementService,
    private readonly accountingSettingsRepository: AccountingSettingsRepository,
    private readonly applyJournalEntryService: ApplyJournalEntryService,
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

    const accountingSettings = await this.accountingSettingsRepository.findByCompany(
      input.companyId,
    );
    let bankGlAccountId: string | null = null;
    if (accountingSettings) {
      if (!input.counterpartAccountId) {
        throw new MissingCounterpartAccountError();
      }
      if (!bankAccount.glAccountId) {
        throw new MissingBankAccountMappingError();
      }
      bankGlAccountId = bankAccount.glAccountId;
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

      if (bankGlAccountId) {
        const amount = new Decimal(input.amount).toFixed(2);
        await this.applyJournalEntryService.apply(
          {
            companyId: input.companyId,
            date: movement.date,
            description: input.description as string,
            currency: bankAccount.currency,
            exchangeRate: '1',
            origin: 'MANUAL',
            createdByUserId: input.requestingUserId,
            lines: [
              {
                accountId: bankGlAccountId,
                debit: input.type === 'DEPOSIT' ? amount : '0',
                credit: input.type === 'DEPOSIT' ? '0' : amount,
              },
              {
                accountId: input.counterpartAccountId as string,
                debit: input.type === 'DEPOSIT' ? '0' : amount,
                credit: input.type === 'DEPOSIT' ? amount : '0',
              },
            ],
          },
          ctx,
        );
      }

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
