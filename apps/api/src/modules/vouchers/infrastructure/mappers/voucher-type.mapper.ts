import { VoucherType as PrismaVoucherType } from '@prisma/client';
import {
  VoucherTypeEntity,
  VoucherFlow,
  StockEffect,
  CurrentAccountEffect,
} from '../../domain/entities/voucher-type.entity';

export class VoucherTypeMapper {
  static toDomain(raw: PrismaVoucherType): VoucherTypeEntity {
    return new VoucherTypeEntity(
      raw.id,
      raw.code,
      raw.name,
      raw.flow as VoucherFlow,
      raw.affectsStock as StockEffect,
      raw.affectsCurrentAccount as CurrentAccountEffect,
      raw.requiresCae,
      raw.isCreditNote,
      raw.relatedVoucherRequired,
      raw.isActive,
    );
  }
}
