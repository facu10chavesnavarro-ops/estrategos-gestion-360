import { BankMovement as PrismaBankMovement } from '@prisma/client';
import { BankMovementEntity, BankMovementType } from '../../domain/entities/bank-movement.entity';

export class BankMovementMapper {
  static toDomain(raw: PrismaBankMovement): BankMovementEntity {
    return new BankMovementEntity(
      raw.id,
      raw.bankAccountId,
      raw.type as BankMovementType,
      raw.amount.toString(),
      raw.paymentId,
      raw.description,
      raw.date,
      raw.isReconciled,
      raw.reconciledAt,
      raw.createdAt,
    );
  }
}
