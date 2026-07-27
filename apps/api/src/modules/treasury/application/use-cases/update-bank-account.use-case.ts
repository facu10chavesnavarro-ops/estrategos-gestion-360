import { Injectable } from '@nestjs/common';
import { BankAccountRepository } from '../../domain/repositories/bank-account.repository';
import { ChartOfAccountRepository } from '../../../accounting/domain/repositories/chart-of-account.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { BankAccountEntity } from '../../domain/entities/bank-account.entity';
import { UpdateBankAccountUseCaseInput } from '../dto/bank-account.dto';
import { BankAccountNotFoundError } from '../../domain/errors/bank.errors';
import { InvalidAccountMappingError } from '../../../accounting/domain/errors/accounting.errors';

/** RN-BANK-04. Mapeo contable: Sprint 4 §2.4. */
@Injectable()
export class UpdateBankAccountUseCase {
  constructor(
    private readonly bankAccountRepository: BankAccountRepository,
    private readonly chartOfAccountRepository: ChartOfAccountRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: UpdateBankAccountUseCaseInput): Promise<BankAccountEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.bankAccountRepository.findById(
      input.bankAccountId,
      input.companyId,
    );
    if (!existing) {
      throw new BankAccountNotFoundError();
    }

    if (input.glAccountId) {
      const account = await this.chartOfAccountRepository.findById(
        input.glAccountId,
        input.companyId,
      );
      if (!account || !account.allowsMovements || !account.isActive) {
        throw new InvalidAccountMappingError();
      }
    }

    return this.unitOfWork.run(async (ctx) => {
      const bankAccount = await this.bankAccountRepository.update(
        input.bankAccountId,
        {
          bankName: input.bankName,
          accountNumber: input.accountNumber,
          cbu: input.cbu,
          alias: input.alias,
          glAccountId: input.glAccountId,
        },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'bank_account.update',
          entityType: 'BankAccount',
          entityId: bankAccount.id,
          metadata: { fields: ['bankName', 'accountNumber', 'cbu', 'alias', 'glAccountId'] },
        },
        ctx,
      );

      return bankAccount;
    });
  }
}
