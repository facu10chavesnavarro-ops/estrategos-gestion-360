import { AccountingSettings as PrismaAccountingSettings } from '@prisma/client';
import { AccountingSettingsEntity } from '../../domain/entities/accounting-settings.entity';

export class AccountingSettingsMapper {
  static toDomain(raw: PrismaAccountingSettings): AccountingSettingsEntity {
    return new AccountingSettingsEntity(
      raw.companyId,
      raw.accountsReceivableId,
      raw.accountsPayableId,
    );
  }
}
