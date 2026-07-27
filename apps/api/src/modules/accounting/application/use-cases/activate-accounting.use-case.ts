import { Injectable } from '@nestjs/common';
import { ChartOfAccountRepository } from '../../domain/repositories/chart-of-account.repository';
import { AccountingSettingsRepository } from '../../domain/repositories/accounting-settings.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { AccountingSettingsEntity } from '../../domain/entities/accounting-settings.entity';
import { ActivateAccountingUseCaseInput } from '../dto/accounting-settings.dto';
import { AccountingAlreadyActivatedError } from '../../domain/errors/accounting.errors';
import {
  CHART_OF_ACCOUNTS_TEMPLATE,
  CHART_OF_ACCOUNTS_TEMPLATE_KEYS,
} from '../chart-of-accounts-template';

/**
 * §2.1: clona la plantilla estándar de Plan de Cuentas para la empresa y
 * crea su `AccountingSettings` (cuentas de control AR/AP), todo dentro de
 * la misma transacción para que un fallo a mitad de camino no deje un
 * Plan de Cuentas parcial sin `AccountingSettings`.
 */
@Injectable()
export class ActivateAccountingUseCase {
  constructor(
    private readonly chartOfAccountRepository: ChartOfAccountRepository,
    private readonly accountingSettingsRepository: AccountingSettingsRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: ActivateAccountingUseCaseInput): Promise<AccountingSettingsEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.accountingSettingsRepository.findByCompany(input.companyId);
    if (existing) {
      throw new AccountingAlreadyActivatedError();
    }

    return this.unitOfWork.run(async (ctx) => {
      const idByCode = new Map<string, string>();
      const idByKey = new Map<string, string>();

      for (const item of CHART_OF_ACCOUNTS_TEMPLATE) {
        const account = await this.chartOfAccountRepository.create(
          {
            companyId: input.companyId,
            parentId: item.parentCode ? idByCode.get(item.parentCode) : undefined,
            code: item.code,
            name: item.name,
            type: item.type,
            allowsMovements: item.allowsMovements,
            isSystemAccount: item.isSystemAccount,
          },
          ctx,
        );
        idByCode.set(item.code, account.id);
        if (item.key) {
          idByKey.set(item.key, account.id);
        }
      }

      const settings = await this.accountingSettingsRepository.create(
        {
          companyId: input.companyId,
          accountsReceivableId: idByKey.get(
            CHART_OF_ACCOUNTS_TEMPLATE_KEYS.ACCOUNTS_RECEIVABLE,
          ) as string,
          accountsPayableId: idByKey.get(CHART_OF_ACCOUNTS_TEMPLATE_KEYS.ACCOUNTS_PAYABLE) as string,
        },
        ctx,
      );

      await this.recordAudit(input, ctx);

      return settings;
    });
  }

  private async recordAudit(
    input: ActivateAccountingUseCaseInput,
    ctx: TransactionContext,
  ): Promise<void> {
    await this.auditLogRepository.record(
      {
        companyId: input.companyId,
        userId: input.requestingUserId,
        action: 'accounting.activate',
        entityType: 'AccountingSettings',
        entityId: input.companyId,
        metadata: { accountsCreated: CHART_OF_ACCOUNTS_TEMPLATE.length },
      },
      ctx,
    );
  }
}
