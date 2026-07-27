import {
  SupplierAccount as PrismaSupplierAccount,
  SupplierAccountMovement as PrismaSupplierAccountMovement,
} from '@prisma/client';
import {
  SupplierAccountEntity,
  SupplierAccountMovementEntity,
} from '../../domain/entities/supplier-account.entity';
import { CurrentAccountMovementType } from '../../domain/entities/customer-account.entity';

export class SupplierAccountMapper {
  static toDomain(raw: PrismaSupplierAccount): SupplierAccountEntity {
    return new SupplierAccountEntity(
      raw.id,
      raw.companyId,
      raw.supplierId,
      raw.currentBalance.toString(),
    );
  }
}

export class SupplierAccountMovementMapper {
  static toDomain(raw: PrismaSupplierAccountMovement): SupplierAccountMovementEntity {
    return new SupplierAccountMovementEntity(
      raw.id,
      raw.supplierAccountId,
      raw.type as CurrentAccountMovementType,
      raw.amount.toString(),
      raw.balanceAfter.toString(),
      raw.voucherId,
      raw.paymentId,
      raw.createdAt,
    );
  }
}
