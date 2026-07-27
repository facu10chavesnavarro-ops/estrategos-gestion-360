import { CashSession as PrismaCashSession } from '@prisma/client';
import { CashSessionEntity } from '../../domain/entities/cash-session.entity';

export class CashSessionMapper {
  static toDomain(raw: PrismaCashSession): CashSessionEntity {
    return new CashSessionEntity(
      raw.id,
      raw.cashRegisterId,
      raw.openedByUserId,
      raw.openingBalance.toString(),
      raw.openedAt,
      raw.closedByUserId,
      raw.closingBalance?.toString() ?? null,
      raw.expectedBalance?.toString() ?? null,
      raw.difference?.toString() ?? null,
      raw.closedAt,
    );
  }
}
