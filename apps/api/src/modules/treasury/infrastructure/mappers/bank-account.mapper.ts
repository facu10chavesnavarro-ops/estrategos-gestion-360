import { BankAccount as PrismaBankAccount } from '@prisma/client';
import { BankAccountEntity, BankAccountType } from '../../domain/entities/bank-account.entity';

export class BankAccountMapper {
  static toDomain(raw: PrismaBankAccount): BankAccountEntity {
    return new BankAccountEntity(
      raw.id,
      raw.companyId,
      raw.bankName,
      raw.accountType as BankAccountType,
      raw.accountNumber,
      raw.cbu,
      raw.alias,
      raw.currency,
      raw.isActive,
    );
  }
}
