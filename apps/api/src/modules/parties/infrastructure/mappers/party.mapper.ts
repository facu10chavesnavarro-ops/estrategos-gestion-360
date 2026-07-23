import { Party as PrismaParty } from '@prisma/client';
import { PartyEntity } from '../../domain/entities/party.entity';

export class PartyMapper {
  static toDomain(raw: PrismaParty): PartyEntity {
    return new PartyEntity(
      raw.id,
      raw.companyId,
      raw.legalName,
      raw.taxId,
      raw.taxCondition,
      raw.email,
      raw.phone,
      raw.address,
      raw.contactName,
      raw.notes,
    );
  }
}
