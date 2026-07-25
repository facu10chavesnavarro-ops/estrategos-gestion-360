import { Tax as PrismaTax } from '@prisma/client';
import { TaxEntity, TaxType } from '../../domain/entities/tax.entity';

export class TaxMapper {
  static toDomain(raw: PrismaTax): TaxEntity {
    return new TaxEntity(
      raw.id,
      raw.companyId,
      raw.name,
      raw.type as TaxType,
      raw.rate.toString(),
      raw.validFrom,
      raw.validTo,
    );
  }
}
