import { Injectable } from '@nestjs/common';
import { AccountingSettingsRepository } from '../../domain/repositories/accounting-settings.repository';
import { ChartOfAccountRepository } from '../../domain/repositories/chart-of-account.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { AccountingSettingsEntity } from '../../domain/entities/accounting-settings.entity';
import { UpdateAccountingSettingsUseCaseInput } from '../dto/accounting-settings.dto';
import {
  AccountingSettingsNotFoundError,
  InvalidAccountMappingError,
} from '../../domain/errors/accounting.errors';

@Injectable()
export class UpdateAccountingSettingsUseCase {
  constructor(
    private readonly accountingSettingsRepository: AccountingSettingsRepository,
    private readonly chartOfAccountRepository: ChartOfAccountRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: UpdateAccountingSettingsUseCaseInput): Promise<AccountingSettingsEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.accountingSettingsRepository.findByCompany(input.companyId);
    if (!existing) {
      throw new AccountingSettingsNotFoundError();
    }

    for (const accountId of [input.accountsReceivableId, input.accountsPayableId]) {
      if (accountId) {
        await this.assertMappableAccount(accountId, input.companyId);
      }
    }

    return this.unitOfWork.run(async (ctx) => {
      const settings = await this.accountingSettingsRepository.update(
        input.companyId,
        {
          accountsReceivableId: input.accountsReceivableId,
          accountsPayableId: input.accountsPayableId,
        },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'accounting_settings.update',
          entityType: 'AccountingSettings',
          entityId: input.companyId,
          metadata: { fields: Object.keys(input).filter((k) => k.endsWith('AccountId')) },
        },
        ctx,
      );

      return settings;
    });
  }

  private async assertMappableAccount(accountId: string, companyId: string): Promise<void> {
    const account = await this.chartOfAccountRepository.findById(accountId, companyId);
    if (!account || !account.allowsMovements || !account.isActive) {
      throw new InvalidAccountMappingError();
    }
  }
}
