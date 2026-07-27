import { Injectable } from '@nestjs/common';
import { CashRegisterRepository } from '../../domain/repositories/cash-register.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { CashRegisterEntity } from '../../domain/entities/cash-register.entity';
import { ChangeCashRegisterStateUseCaseInput } from '../dto/cash-register.dto';
import {
  CashRegisterNotFoundError,
  CashRegisterAlreadyInTargetStateError,
} from '../../domain/errors/cash.errors';

/** RN-CASH-07/08. */
@Injectable()
export class DeactivateCashRegisterUseCase {
  constructor(
    private readonly cashRegisterRepository: CashRegisterRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: ChangeCashRegisterStateUseCaseInput): Promise<CashRegisterEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.cashRegisterRepository.findById(
      input.cashRegisterId,
      input.companyId,
    );
    if (!existing) {
      throw new CashRegisterNotFoundError();
    }
    if (!existing.isActive) {
      throw new CashRegisterAlreadyInTargetStateError('inactiva');
    }

    return this.unitOfWork.run(async (ctx) => {
      const cashRegister = await this.cashRegisterRepository.setActive(
        input.cashRegisterId,
        false,
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'cash_register.deactivate',
          entityType: 'CashRegister',
          entityId: cashRegister.id,
        },
        ctx,
      );

      return cashRegister;
    });
  }
}
