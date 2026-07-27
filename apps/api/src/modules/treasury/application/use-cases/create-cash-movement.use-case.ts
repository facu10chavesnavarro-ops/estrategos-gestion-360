import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { CashSessionRepository } from '../../domain/repositories/cash-session.repository';
import { ApplyCashMovementService } from '../services/apply-cash-movement.service';
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
 */
@Injectable()
export class CreateCashMovementUseCase {
  constructor(
    private readonly cashSessionRepository: CashSessionRepository,
    private readonly applyCashMovementService: ApplyCashMovementService,
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
