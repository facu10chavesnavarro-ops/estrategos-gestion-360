import { PaymentMethod as PrismaPaymentMethod } from '@prisma/client';
import { PaymentMethodEntity } from '../../domain/entities/payment-method.entity';

export class PaymentMethodMapper {
  static toDomain(raw: PrismaPaymentMethod): PaymentMethodEntity {
    return new PaymentMethodEntity(
      raw.id,
      raw.code,
      raw.name,
      raw.requiresCheckDetail,
      raw.requiresCardDetail,
      raw.requiresCashMovement,
      raw.requiresBankMovement,
      raw.isActive,
    );
  }
}
