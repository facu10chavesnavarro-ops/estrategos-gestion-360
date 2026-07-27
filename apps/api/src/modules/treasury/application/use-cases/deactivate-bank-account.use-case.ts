import { Injectable } from '@nestjs/common';
import { BankAccountRepository } from '../../domain/repositories/bank-account.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { BankAccountEntity } from '../../domain/entities/bank-account.entity';
import { ChangeBankAccountStateUseCaseInput } from '../dto/bank-account.dto';
import {
  BankAccountNotFoundError,
  BankAccountAlreadyInTargetStateError,
} from '../../domain/errors/bank.errors';

/** RN-BANK-04. */
@Injectable()
export class DeactivateBankAccountUseCase {
  constructor(
    private readonly bankAccountRepository: BankAccountRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: ChangeBankAccountStateUseCaseInput): Promise<BankAccountEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.bankAccountRepository.findById(
      input.bankAccountId,
      input.companyId,
    );
    if (!existing) {
      throw new BankAccountNotFoundError();
    }
    if (!existing.isActive) {
      throw new BankAccountAlreadyInTargetStateError('inactiva');
    }

    return this.unitOfWork.run(async (ctx) => {
      const bankAccount = await this.bankAccountRepository.setActive(
        input.bankAccountId,
        false,
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'bank_account.deactivate',
          entityType: 'BankAccount',
          entityId: bankAccount.id,
        },
        ctx,
      );

      return bankAccount;
    });
  }
}
