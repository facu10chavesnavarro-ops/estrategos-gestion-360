import { Supplier as PrismaSupplier, Party as PrismaParty } from '@prisma/client';
import { SupplierEntity } from '../../domain/entities/supplier.entity';

export class SupplierMapper {
  static toDomain(raw: PrismaSupplier & { party: PrismaParty }): SupplierEntity {
    return new SupplierEntity(
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
      raw.bankName,
      raw.bankAccountHolder,
      raw.bankCbu,
      raw.isActive,
    );
  }
}
