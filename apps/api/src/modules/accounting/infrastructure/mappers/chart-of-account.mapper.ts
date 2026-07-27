import { ChartOfAccount as PrismaChartOfAccount } from '@prisma/client';
import { AccountType, ChartOfAccountEntity } from '../../domain/entities/chart-of-account.entity';

export class ChartOfAccountMapper {
  static toDomain(raw: PrismaChartOfAccount): ChartOfAccountEntity {
    return new ChartOfAccountEntity(
      raw.id,
      raw.companyId,
      raw.parentId,
      raw.code,
      raw.name,
      raw.type as AccountType,
      raw.allowsMovements,
      raw.isSystemAccount,
      raw.isActive,
    );
  }
}
