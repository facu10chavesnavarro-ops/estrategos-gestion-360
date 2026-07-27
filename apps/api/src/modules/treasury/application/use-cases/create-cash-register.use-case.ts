import { Injectable } from '@nestjs/common';
import { CashRegisterRepository } from '../../domain/repositories/cash-register.repository';
import { BranchRepository } from '../../../companies/domain/repositories/branch.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { CashRegisterEntity } from '../../domain/entities/cash-register.entity';
import { CreateCashRegisterUseCaseInput } from '../dto/cash-register.dto';
import { InvalidCashRegisterBranchError } from '../../domain/errors/cash.errors';

/** RN-CASH-01/07/08. */
@Injectable()
export class CreateCashRegisterUseCase {
  constructor(
    private readonly cashRegisterRepository: CashRegisterRepository,
    private readonly branchRepository: BranchRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: CreateCashRegisterUseCaseInput): Promise<CashRegisterEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const branch = await this.branchRepository.findById(input.branchId);
    if (!branch || branch.companyId !== input.companyId) {
      throw new InvalidCashRegisterBranchError();
    }

    return this.unitOfWork.run(async (ctx) => {
      const cashRegister = await this.cashRegisterRepository.create(
        { companyId: input.companyId, branchId: input.branchId, name: input.name },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'cash_register.create',
          entityType: 'CashRegister',
          entityId: cashRegister.id,
          metadata: { name: cashRegister.name, branchId: cashRegister.branchId },
        },
        ctx,
      );

      return cashRegister;
    });
  }
}
