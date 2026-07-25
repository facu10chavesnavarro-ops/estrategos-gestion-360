import { Company as PrismaCompany } from '@prisma/client';
import { CompanyEntity } from '../../domain/entities/company.entity';

export class CompanyMapper {
  static toDomain(raw: PrismaCompany): CompanyEntity {
    return new CompanyEntity(
      raw.id,
      raw.tenantId,
      raw.legalName,
      raw.taxId,
      raw.taxCondition,
      raw.activity,
      raw.address,
      raw.contactName,
      raw.contactEmail,
      raw.contactPhone,
      raw.logoUrl,
      raw.currency,
      raw.timezone,
      raw.allowNegativeStock,
      raw.isActive,
    );
  }
}
