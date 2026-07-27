import { Injectable } from '@nestjs/common';
import { CompanyPaymentMethodAccountRepository } from '../../domain/repositories/company-payment-method-account.repository';
import { ChartOfAccountRepository } from '../../domain/repositories/chart-of-account.repository';
import { PaymentMethodRepository } from '../../../treasury/domain/repositories/payment-method.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { CompanyPaymentMethodAccountEntity } from '../../domain/entities/company-payment-method-account.entity';
import { SetPaymentMethodAccountMappingUseCaseInput } from '../dto/accounting-settings.dto';
import { InvalidAccountMappingError } from '../../domain/errors/accounting.errors';
import { InvalidPaymentMethodError } from '../../../treasury/domain/errors/payment.errors';

/**
 * §2.4 hallazgo 1/2: PaymentMethod es global y el mismo medio necesita una
 * cuenta distinta según `direction` — se mapea por empresa+medio+sentido.
 */
@Injectable()
export class SetPaymentMethodAccountMappingUseCase {
  constructor(
    private readonly companyPaymentMethodAccountRepository: CompanyPaymentMethodAccountRepository,
    private readonly chartOfAccountRepository: ChartOfAccountRepository,
    private readonly paymentMethodRepository: PaymentMethodRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(
    input: SetPaymentMethodAccountMappingUseCaseInput,
  ): Promise<CompanyPaymentMethodAccountEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const method = await this.paymentMethodRepository.findById(input.paymentMethodId);
    if (!method) {
      throw new InvalidPaymentMethodError();
    }

    const account = await this.chartOfAccountRepository.findById(input.accountId, input.companyId);
    if (!account || !account.allowsMovements || !account.isActive) {
      throw new InvalidAccountMappingError();
    }

    return this.unitOfWork.run(async (ctx) => {
      const mapping = await this.companyPaymentMethodAccountRepository.upsert(
        {
          companyId: input.companyId,
          paymentMethodId: input.paymentMethodId,
          direction: input.direction,
          accountId: input.accountId,
        },
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'payment_method_account_mapping.set',
          entityType: 'CompanyPaymentMethodAccount',
          entityId: `${input.paymentMethodId}:${input.direction}`,
          metadata: { paymentMethodId: input.paymentMethodId, direction: input.direction, accountId: input.accountId },
        },
        ctx,
      );

      return mapping;
    });
  }
}
