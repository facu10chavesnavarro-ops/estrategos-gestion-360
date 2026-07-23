import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../domain/repositories/customer.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { CustomerEntity } from '../../domain/entities/customer.entity';
import { ChangeCustomerStateUseCaseInput } from '../dto/customer.dto';
import {
  CustomerNotFoundError,
  CustomerAlreadyInTargetStateError,
} from '../../domain/errors/customer.errors';

/** RN-TER-03/04/05/12. */
@Injectable()
export class DeactivateCustomerUseCase {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: ChangeCustomerStateUseCaseInput): Promise<CustomerEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const existing = await this.customerRepository.findById(
      input.customerId,
      input.companyId,
    );
    if (!existing) {
      throw new CustomerNotFoundError();
    }
    if (!existing.isActive) {
      throw new CustomerAlreadyInTargetStateError('inactivo');
    }

    const customer = await this.customerRepository.setActive(input.customerId, false);

    await this.auditLogRepository.record({
      companyId: input.companyId,
      userId: input.requestingUserId,
      action: 'customer.deactivate',
      entityType: 'Customer',
      entityId: customer.id,
    });

    return customer;
  }
}
