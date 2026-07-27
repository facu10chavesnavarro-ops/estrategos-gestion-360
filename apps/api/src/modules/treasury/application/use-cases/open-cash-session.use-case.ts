import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { CashRegisterRepository } from '../../domain/repositories/cash-register.repository';
import { CashSessionRepository } from '../../domain/repositories/cash-session.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { CashSessionEntity } from '../../domain/entities/cash-session.entity';
import { OpenCashSessionUseCaseInput } from '../dto/cash-session.dto';
import {
  CashRegisterNotFoundError,
  CashRegisterAlreadyHasOpenSessionError,
  InvalidOpeningBalanceError,
} from '../../domain/errors/cash.errors';

/** RN-CASH-02/03/07/08. */
@Injectable()
export class OpenCashSessionUseCase {
  constructor(
    private readonly cashRegisterRepository: CashRegisterRepository,
    private readonly cashSessionRepository: CashSessionRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: OpenCashSessionUseCaseInput): Promise<CashSessionEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const cashRegister = await this.cashRegisterRepository.findById(
      input.cashRegisterId,
      input.companyId,
    );
    if (!cashRegister) {
      throw new CashRegisterNotFoundError();
    }

    if (!(new Decimal(input.openingBalance).greaterThanOrEqualTo(0))) {
      throw new InvalidOpeningBalanceError();
    }

    return this.unitOfWork.run(async (ctx) => {
      const openSession = await this.cashSessionRepository.findOpenByCashRegister(
        input.cashRegisterId,
        ctx,
      );
      if (openSession) {
        throw new CashRegisterAlreadyHasOpenSessionError();
      }

      const session = await this.cashSessionRepository.create(
        {
          cashRegisterId: input.cashRegisterId,
          openedByUserId: input.requestingUserId,
          openingBalance: new Decimal(input.openingBalance).toFixed(2),
        },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'cash_session.open',
          entityType: 'CashSession',
          entityId: session.id,
          metadata: { cashRegisterId: input.cashRegisterId, openingBalance: session.openingBalance },
        },
        ctx,
      );

      return session;
    });
  }
}
