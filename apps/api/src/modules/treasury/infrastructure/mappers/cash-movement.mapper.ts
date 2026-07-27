import { CashMovement as PrismaCashMovement } from '@prisma/client';
import { CashMovementEntity, CashMovementType } from '../../domain/entities/cash-movement.entity';

export class CashMovementMapper {
  static toDomain(raw: PrismaCashMovement): CashMovementEntity {
    return new CashMovementEntity(
      raw.id,
      raw.cashSessionId,
      raw.type as CashMovementType,
      raw.amount.toString(),
      raw.paymentId,
      raw.reason,
      raw.createdAt,
    );
  }
}
