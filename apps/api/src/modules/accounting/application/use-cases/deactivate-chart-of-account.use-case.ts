import { Injectable } from '@nestjs/common';
import { ChartOfAccountRepository } from '../../domain/repositories/chart-of-account.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { ChartOfAccountEntity } from '../../domain/entities/chart-of-account.entity';
import { ChangeChartOfAccountStateUseCaseInput } from '../dto/chart-of-account.dto';
import {
  ChartOfAccountNotFoundError,
  ChartOfAccountAlreadyInTargetStateError,
  SystemAccountCannotBeDeactivatedError,
} from '../../domain/errors/accounting.errors';

/** RN-ACC-02: una cuenta de sistema nunca puede desactivarse. */
@Injectable()
export class DeactivateChartOfAccountUseCase {
  constructor(
    private readonly chartOfAccountRepository: ChartOfAccountRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: ChangeChartOfAccountStateUseCaseInput): Promise<ChartOfAccountEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.chartOfAccountRepository.findById(input.accountId, input.companyId);
    if (!existing) {
      throw new ChartOfAccountNotFoundError();
    }
    if (!existing.isActive) {
      throw new ChartOfAccountAlreadyInTargetStateError('inactiva');
    }
    if (existing.isSystemAccount) {
      throw new SystemAccountCannotBeDeactivatedError();
    }

    return this.unitOfWork.run(async (ctx) => {
      const account = await this.chartOfAccountRepository.setActive(input.accountId, false, ctx);

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'chart_of_account.deactivate',
          entityType: 'ChartOfAccount',
          entityId: account.id,
          metadata: {},
        },
        ctx,
      );

      return account;
    });
  }
}
