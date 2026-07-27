import { CashRegister as PrismaCashRegister } from '@prisma/client';
import { CashRegisterEntity } from '../../domain/entities/cash-register.entity';

export class CashRegisterMapper {
  static toDomain(raw: PrismaCashRegister): CashRegisterEntity {
    return new CashRegisterEntity(
      raw.id,
      raw.companyId,
      raw.branchId,
      raw.name,
      raw.isActive,
      raw.accountId,
    );
  }
}
