import {
  Voucher as PrismaVoucher,
  VoucherLine as PrismaVoucherLine,
  VoucherLineTax as PrismaVoucherLineTax,
} from '@prisma/client';
import { VoucherEntity, VoucherLineEntity } from '../../domain/entities/voucher.entity';

type PrismaVoucherLineWithTaxes = PrismaVoucherLine & { taxes: PrismaVoucherLineTax[] };
export type PrismaVoucherWithLines = PrismaVoucher & { lines: PrismaVoucherLineWithTaxes[] };

export class VoucherMapper {
  static toDomain(raw: PrismaVoucherWithLines): VoucherEntity {
    return new VoucherEntity(
      raw.id,
      raw.companyId,
      raw.branchId,
      raw.pointOfSaleId,
      raw.voucherTypeId,
      raw.number,
      raw.partyId,
      raw.warehouseId,
      raw.issueDate,
      raw.currency,
      raw.exchangeRate.toString(),
      raw.relatedVoucherId,
      raw.subtotal.toString(),
      raw.taxTotal.toString(),
      raw.total.toString(),
      raw.cae,
      raw.caeExpirationDate,
      raw.createdByUserId,
      raw.createdAt,
      raw.lines
        .slice()
        .sort((a, b) => a.lineNumber - b.lineNumber)
        .map(
          (line) =>
            new VoucherLineEntity(
              line.id,
              line.lineNumber,
              line.itemId,
              line.description,
              line.quantity.toString(),
              line.unitPrice.toString(),
              line.discountPercentage.toString(),
              line.subtotal.toString(),
              line.taxes.map((tax) => ({
                taxId: tax.taxId,
                rate: tax.rate.toString(),
                amount: tax.amount.toString(),
              })),
            ),
        ),
    );
  }
}
