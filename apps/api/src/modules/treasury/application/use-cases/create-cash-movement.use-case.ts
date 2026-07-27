import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { CashSessionRepository } from '../../domain/repositories/cash-session.repository';
import { CashRegisterRepository } from '../../domain/repositories/cash-register.repository';
import { ApplyCashMovementService } from '../services/apply-cash-movement.service';
import { AccountingSettingsRepository } from '../../../accounting/domain/repositories/accounting-settings.repository';
import { ApplyJournalEntryService } from '../../../accounting/application/services/apply-journal-entry.service';
import {
  MissingCashRegisterAccountMappingError,
  MissingCounterpartAccountError,
} from '../../../accounting/domain/errors/accounting.errors';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { CashMovementEntity } from '../../domain/entities/cash-movement.entity';
import { CreateCashMovementUseCaseInput } from '../dto/cash-session.dto';
import {
  CashSessionNotFoundError,
  CashSessionNotOpenError,
  MissingCashMovementReasonError,
  InvalidCashMovementAmountError,
} from '../../domain/errors/cash.errors';

/**
 * Movimiento manual de caja (RN-CASH-05/06/07/08) — sin `paymentId`, por
 * eso exige `reason`. Los movimientos que sí vienen de un `Payment` se
 * crean desde `CreatePaymentUseCase` (Sprint 3.4/3.5), no desde acá.
 * Sprint 4 (RN-ACC-06): con Contabilidad activa, exige además
 * `counterpartAccountId` y genera su propio asiento (Debe/Haber contra la
 * cuenta de la caja).
 */
@Injectable()
export class CreateCashMovementUseCase {
  constructor(
    private readonly cashSessionRepository: CashSessionRepository,
    private readonly cashRegisterRepository: CashRegisterRepository,
    private readonly applyCashMovementService: ApplyCashMovementService,
    private readonly accountingSettingsRepository: AccountingSettingsRepository,
    private readonly applyJournalEntryService: ApplyJournalEntryService,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: CreateCashMovementUseCaseInput): Promise<CashMovementEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    if (!input.reason) {
      throw new MissingCashMovementReasonError();
    }
    if (!(new Decimal(input.amount).greaterThan(0))) {
      throw new InvalidCashMovementAmountError();
    }

    const session = await this.cashSessionRepository.findById(
      input.cashSessionId,
      input.companyId,
    );
    if (!session) {
      throw new CashSessionNotFoundError();
    }
    if (!session.isOpen) {
      throw new CashSessionNotOpenError();
    }

    const accountingSettings = await this.accountingSettingsRepository.findByCompany(
      input.companyId,
    );
    let cashRegisterAccountId: string | null = null;
    if (accountingSettings) {
      if (!input.counterpartAccountId) {
        throw new MissingCounterpartAccountError();
      }
      const cashRegister = await this.cashRegisterRepository.findById(
        session.cashRegisterId,
        input.companyId,
      );
      if (!cashRegister?.accountId) {
        throw new MissingCashRegisterAccountMappingError();
      }
      cashRegisterAccountId = cashRegister.accountId;
    }

    return this.unitOfWork.run(async (ctx) => {
      const movement = await this.applyCashMovementService.apply(
        {
          cashSessionId: input.cashSessionId,
          type: input.type,
          amount: new Decimal(input.amount).toFixed(2),
          reason: input.reason,
        },
        ctx,
      );

      if (cashRegisterAccountId) {
        const amount = new Decimal(input.amount).toFixed(2);
        await this.applyJournalEntryService.apply(
          {
            companyId: input.companyId,
            date: movement.createdAt,
            description: input.reason as string,
            currency: 'ARS',
            exchangeRate: '1',
            origin: 'MANUAL',
            createdByUserId: input.requestingUserId,
            lines: [
              {
                accountId: cashRegisterAccountId,
                debit: input.type === 'IN' ? amount : '0',
                credit: input.type === 'IN' ? '0' : amount,
              },
              {
                accountId: input.counterpartAccountId as string,
                debit: input.type === 'IN' ? '0' : amount,
                credit: input.type === 'IN' ? amount : '0',
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
          action: input.type === 'IN' ? 'cash_movement.in' : 'cash_movement.out',
          entityType: 'CashMovement',
          entityId: movement.id,
          metadata: { cashSessionId: input.cashSessionId, amount: movement.amount, reason: input.reason },
        },
        ctx,
      );

      return movement;
    });
  }
}
