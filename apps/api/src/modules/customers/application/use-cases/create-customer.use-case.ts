import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../domain/repositories/customer.repository';
import { PartyRepository } from '../../../parties/domain/repositories/party.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { assertRoleIn } from '../../../../common/domain/rules/assert-role';
import { ROLES_THAT_CAN_MANAGE_COMPANY } from '../../../../common/domain/rules/company-roles';
import { isValidTaxId } from '../../../../common/domain/rules/tax-id.validator';
import { CustomerEntity } from '../../domain/entities/customer.entity';
import { CreateCustomerUseCaseInput } from '../dto/customer.dto';
import {
  DuplicateCustomerError,
  InvalidCreditLimitError,
  InvalidTaxIdError,
} from '../../domain/errors/customer.errors';

/** RN-TER-06/07/08/12/13. */
@Injectable()
export class CreateCustomerUseCase {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly partyRepository: PartyRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: CreateCustomerUseCaseInput): Promise<CustomerEntity> {
    assertRoleIn(input.requestingRoleName, ROLES_THAT_CAN_MANAGE_COMPANY);

    if (input.taxId && !isValidTaxId(input.taxId)) {
      throw new InvalidTaxIdError();
    }
    if (input.creditLimit !== undefined && Number(input.creditLimit) < 0) {
      throw new InvalidCreditLimitError();
    }

    let partyId: string;
    if (input.taxId) {
      const existingParty = await this.partyRepository.findByTaxId(
        input.companyId,
        input.taxId,
      );
      if (existingParty) {
        // RN-TER-13: ya existe el Tercero — si ya es Cliente, es un duplicado;
        // si no, se le agrega el rol reutilizando sus datos tal cual están.
        const existingCustomer = await this.customerRepository.findByPartyId(
          existingParty.id,
        );
        if (existingCustomer) {
          throw new DuplicateCustomerError();
        }
        partyId = existingParty.id;
      } else {
        const party = await this.partyRepository.create({
          companyId: input.companyId,
          legalName: input.legalName,
          taxId: input.taxId,
          taxCondition: input.taxCondition,
          email: input.email,
          phone: input.phone,
          address: input.address,
          contactName: input.contactName,
          notes: input.notes,
        });
        partyId = party.id;
      }
    } else {
      const party = await this.partyRepository.create({
        companyId: input.companyId,
        legalName: input.legalName,
        taxCondition: input.taxCondition,
        email: input.email,
        phone: input.phone,
        address: input.address,
        contactName: input.contactName,
        notes: input.notes,
      });
      partyId = party.id;
    }

    const customer = await this.customerRepository.create({
      partyId,
      companyId: input.companyId,
      paymentTermDays: input.paymentTermDays,
      creditLimit: input.creditLimit,
    });

    await this.auditLogRepository.record({
      companyId: input.companyId,
      userId: input.requestingUserId,
      action: 'customer.create',
      entityType: 'Customer',
      entityId: customer.id,
      metadata: { legalName: customer.legalName },
    });

    return customer;
  }
}
