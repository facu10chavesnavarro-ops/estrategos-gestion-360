import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { CashSessionRepository } from '../../domain/repositories/cash-session.repository';
import { CashMovementRepository } from '../../domain/repositories/cash-movement.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { CashSessionEntity } from '../../domain/entities/cash-session.entity';
import { CloseCashSessionUseCaseInput } from '../dto/cash-session.dto';
import {
  CashSessionNotFoundError,
  CashSessionAlreadyClosedError,
} from '../../domain/errors/cash.errors';

/**
 * RN-CASH-04/07/08: calcula `expectedBalance = openingBalance + Σ(IN) -
 * Σ(OUT)` y `difference = closingBalance - expectedBalance`, ambos
 * persistidos como snapshot al momento del cierre.
 */
@Injectable()
export class CloseCashSessionUseCase {
  constructor(
    private readonly cashSessionRepository: CashSessionRepository,
    private readonly cashMovementRepository: CashMovementRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: CloseCashSessionUseCaseInput): Promise<CashSessionEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.cashSessionRepository.findById(
      input.cashSessionId,
      input.companyId,
    );
    if (!existing) {
      throw new CashSessionNotFoundError();
    }
    if (!existing.isOpen) {
      throw new CashSessionAlreadyClosedError();
    }

    return this.unitOfWork.run(async (ctx) => {
      const sumIn = new Decimal(
        await this.cashMovementRepository.sumAmountBySessionAndType(
          input.cashSessionId,
          'IN',
          ctx,
        ),
      );
      const sumOut = new Decimal(
        await this.cashMovementRepository.sumAmountBySessionAndType(
          input.cashSessionId,
          'OUT',
          ctx,
        ),
      );
      const expectedBalance = new Decimal(existing.openingBalance).plus(sumIn).minus(sumOut);
      const closingBalance = new Decimal(input.closingBalance);
      const difference = closingBalance.minus(expectedBalance);

      const session = await this.cashSessionRepository.close(
        input.cashSessionId,
        {
          closedByUserId: input.requestingUserId,
          closingBalance: closingBalance.toFixed(2),
          expectedBalance: expectedBalance.toFixed(2),
          difference: difference.toFixed(2),
        },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'cash_session.close',
          entityType: 'CashSession',
          entityId: session.id,
          metadata: {
            closingBalance: session.closingBalance,
            expectedBalance: session.expectedBalance,
            difference: session.difference,
          },
        },
        ctx,
      );

      return session;
    });
  }
}
