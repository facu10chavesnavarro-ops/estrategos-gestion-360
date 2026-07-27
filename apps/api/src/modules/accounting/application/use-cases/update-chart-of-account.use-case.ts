import { Injectable } from '@nestjs/common';
import { ChartOfAccountRepository } from '../../domain/repositories/chart-of-account.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { ChartOfAccountEntity } from '../../domain/entities/chart-of-account.entity';
import { UpdateChartOfAccountUseCaseInput } from '../dto/chart-of-account.dto';
import {
  ChartOfAccountNotFoundError,
  InvalidParentAccountError,
  AccountCycleError,
} from '../../domain/errors/accounting.errors';

const MAX_DEPTH = 100;

/** Mismo criterio de jerarquía que `UpdateCategoryUseCase` (RN-CAT-02/03). */
@Injectable()
export class UpdateChartOfAccountUseCase {
  constructor(
    private readonly chartOfAccountRepository: ChartOfAccountRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: UpdateChartOfAccountUseCaseInput): Promise<ChartOfAccountEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.chartOfAccountRepository.findById(input.accountId, input.companyId);
    if (!existing) {
      throw new ChartOfAccountNotFoundError();
    }

    return this.unitOfWork.run(async (ctx) => {
      if (input.parentId) {
        await this.assertValidNewParent(input.accountId, input.parentId, input.companyId, ctx);
      }

      const account = await this.chartOfAccountRepository.update(
        input.accountId,
        { parentId: input.parentId, name: input.name },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'chart_of_account.update',
          entityType: 'ChartOfAccount',
          entityId: account.id,
          metadata: { fields: ['parentId', 'name'] },
        },
        ctx,
      );

      return account;
    });
  }

  private async assertValidNewParent(
    accountId: string,
    newParentId: string,
    companyId: string,
    ctx: TransactionContext,
  ): Promise<void> {
    if (newParentId === accountId) {
      throw new AccountCycleError();
    }

    let current = await this.chartOfAccountRepository.findById(newParentId, companyId, ctx);
    if (!current) {
      throw new InvalidParentAccountError();
    }

    for (let depth = 0; depth < MAX_DEPTH && current.parentId; depth++) {
      if (current.parentId === accountId) {
        throw new AccountCycleError();
      }
      current = await this.chartOfAccountRepository.findById(current.parentId, companyId, ctx);
      if (!current) break;
    }
  }
}
