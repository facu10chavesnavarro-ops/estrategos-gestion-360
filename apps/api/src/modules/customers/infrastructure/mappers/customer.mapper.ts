import { Customer as PrismaCustomer, Party as PrismaParty } from '@prisma/client';
import { CustomerEntity } from '../../domain/entities/customer.entity';

export class CustomerMapper {
  static toDomain(raw: PrismaCustomer & { party: PrismaParty }): CustomerEntity {
    return new CustomerEntity(
      raw.id,
      raw.partyId,
      raw.companyId,
      raw.party.legalName,
      raw.party.taxId,
      raw.party.taxCondition,
      raw.party.email,
      raw.party.phone,
      raw.party.address,
      raw.party.contactName,
      raw.party.notes,
      raw.paymentTermDays,
      raw.creditLimit?.toString() ?? null,
      raw.isActive,
    );
  }
}
