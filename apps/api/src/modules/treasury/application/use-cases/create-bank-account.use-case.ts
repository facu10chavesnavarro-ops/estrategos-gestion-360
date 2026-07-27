import { Injectable } from '@nestjs/common';
import { BankAccountRepository } from '../../domain/repositories/bank-account.repository';
import { CompanyRepository } from '../../../companies/domain/repositories/company.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { BankAccountEntity } from '../../domain/entities/bank-account.entity';
import { CreateBankAccountUseCaseInput } from '../dto/bank-account.dto';

/** RN-BANK-01/04. */
@Injectable()
export class CreateBankAccountUseCase {
  constructor(
    private readonly bankAccountRepository: BankAccountRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: CreateBankAccountUseCaseInput): Promise<BankAccountEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const company = await this.companyRepository.findById(input.companyId);

    return this.unitOfWork.run(async (ctx) => {
      const bankAccount = await this.bankAccountRepository.create(
        {
          companyId: input.companyId,
          bankName: input.bankName,
          accountType: input.accountType,
          accountNumber: input.accountNumber,
          cbu: input.cbu,
          alias: input.alias,
          currency: input.currency ?? company?.currency ?? 'ARS',
        },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'bank_account.create',
          entityType: 'BankAccount',
          entityId: bankAccount.id,
          metadata: { bankName: bankAccount.bankName, accountType: bankAccount.accountType },
        },
        ctx,
      );

      return bankAccount;
    });
  }
}
