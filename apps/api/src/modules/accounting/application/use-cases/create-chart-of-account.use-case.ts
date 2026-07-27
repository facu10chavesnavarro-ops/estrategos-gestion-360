import { Injectable } from '@nestjs/common';
import { ChartOfAccountRepository } from '../../domain/repositories/chart-of-account.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { ChartOfAccountEntity } from '../../domain/entities/chart-of-account.entity';
import { CreateChartOfAccountUseCaseInput } from '../dto/chart-of-account.dto';
import {
  InvalidParentAccountError,
  DuplicateAccountCodeError,
} from '../../domain/errors/accounting.errors';

@Injectable()
export class CreateChartOfAccountUseCase {
  constructor(
    private readonly chartOfAccountRepository: ChartOfAccountRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: CreateChartOfAccountUseCaseInput): Promise<ChartOfAccountEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const duplicate = await this.chartOfAccountRepository.findByCode(input.companyId, input.code);
    if (duplicate) {
      throw new DuplicateAccountCodeError();
    }

    if (input.parentId) {
      const parent = await this.chartOfAccountRepository.findById(input.parentId, input.companyId);
      if (!parent) {
        throw new InvalidParentAccountError();
      }
    }

    return this.unitOfWork.run(async (ctx) => {
      const account = await this.chartOfAccountRepository.create(
        {
          companyId: input.companyId,
          parentId: input.parentId,
          code: input.code,
          name: input.name,
          type: input.type,
          allowsMovements: input.allowsMovements,
        },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'chart_of_account.create',
          entityType: 'ChartOfAccount',
          entityId: account.id,
          metadata: { code: account.code, type: account.type },
        },
        ctx,
      );

      return account;
    });
  }
}
