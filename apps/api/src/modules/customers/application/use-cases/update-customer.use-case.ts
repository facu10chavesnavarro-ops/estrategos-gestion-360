import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../domain/repositories/customer.repository';
import { PartyRepository } from '../../../parties/domain/repositories/party.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import { pick } from '../../../../common/application/pick';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { isValidTaxId } from '../../../../common/domain/rules/tax-id.validator';
import { CustomerEntity } from '../../domain/entities/customer.entity';
import { UpdateCustomerUseCaseInput } from '../dto/customer.dto';
import {
  CustomerNotFoundError,
  InvalidCreditLimitError,
  InvalidTaxIdError,
} from '../../domain/errors/customer.errors';

const PARTY_FIELDS = [
  'legalName',
  'taxId',
  'taxCondition',
  'email',
  'phone',
  'address',
  'contactName',
  'notes',
] as const;
const CUSTOMER_FIELDS = ['paymentTermDays', 'creditLimit'] as const;

/** RN-TER-06/08/12/14: edita en una sola operación datos del Party y del rol. */
@Injectable()
export class UpdateCustomerUseCase {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly partyRepository: PartyRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: UpdateCustomerUseCaseInput): Promise<CustomerEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    const customer = await this.customerRepository.findById(
      input.customerId,
      input.companyId,
    );
    if (!customer) {
      throw new CustomerNotFoundError();
    }
    if (input.taxId && !isValidTaxId(input.taxId)) {
      throw new InvalidTaxIdError();
    }
    if (input.creditLimit !== undefined && Number(input.creditLimit) < 0) {
      throw new InvalidCreditLimitError();
    }

    const partyPatch = pick(input, PARTY_FIELDS);
    const customerPatch = pick(input, CUSTOMER_FIELDS);

    return this.unitOfWork.run(async (ctx) => {
      if (Object.keys(partyPatch).length > 0) {
        await this.partyRepository.update(customer.partyId, partyPatch, ctx);
      }
      if (Object.keys(customerPatch).length > 0) {
        await this.customerRepository.update(customer.id, customerPatch, ctx);
      }

      const result = await this.customerRepository.findById(
        customer.id,
        input.companyId,
        ctx,
      );

      await this.auditLogRepository.record(
        {
          companyId: input.companyId,
          userId: input.requestingUserId,
          action: 'customer.update',
          entityType: 'Customer',
          entityId: customer.id,
          metadata: {
            fields: [...Object.keys(partyPatch), ...Object.keys(customerPatch)],
          },
        },
        ctx,
      );

      return result!;
    });
  }
}
