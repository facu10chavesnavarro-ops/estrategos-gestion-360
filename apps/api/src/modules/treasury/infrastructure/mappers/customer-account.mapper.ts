import {
  CustomerAccount as PrismaCustomerAccount,
  CustomerAccountMovement as PrismaCustomerAccountMovement,
} from '@prisma/client';
import {
  CustomerAccountEntity,
  CustomerAccountMovementEntity,
  CurrentAccountMovementType,
} from '../../domain/entities/customer-account.entity';

export class CustomerAccountMapper {
  static toDomain(raw: PrismaCustomerAccount): CustomerAccountEntity {
    return new CustomerAccountEntity(
      raw.id,
      raw.companyId,
      raw.customerId,
      raw.currentBalance.toString(),
    );
  }
}

export class CustomerAccountMovementMapper {
  static toDomain(raw: PrismaCustomerAccountMovement): CustomerAccountMovementEntity {
    return new CustomerAccountMovementEntity(
      raw.id,
      raw.customerAccountId,
      raw.type as CurrentAccountMovementType,
      raw.amount.toString(),
      raw.balanceAfter.toString(),
      raw.voucherId,
      raw.paymentId,
      raw.createdAt,
    );
  }
}
