import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  VoucherRepository,
  CreateVoucherInput,
  ListVouchersFilters,
} from '../../domain/repositories/voucher.repository';
import { VoucherEntity } from '../../domain/entities/voucher.entity';
import { VoucherMapper } from '../mappers/voucher.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

const WITH_LINES = {
  include: { lines: { include: { taxes: true } } },
} as const;

@Injectable()
export class PrismaVoucherRepository extends VoucherRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreateVoucherInput, ctx?: TransactionContext): Promise<VoucherEntity> {
    const raw = await resolveClient(this.prisma, ctx).voucher.create({
      data: {
        id: input.id,
        companyId: input.companyId,
        branchId: input.branchId,
        pointOfSaleId: input.pointOfSaleId,
        voucherTypeId: input.voucherTypeId,
        number: input.number,
        partyId: input.partyId,
        warehouseId: input.warehouseId,
        issueDate: input.issueDate,
        currency: input.currency,
        exchangeRate: input.exchangeRate,
        relatedVoucherId: input.relatedVoucherId,
        subtotal: input.subtotal,
        taxTotal: input.taxTotal,
        total: input.total,
        createdByUserId: input.createdByUserId,
        lines: {
          create: input.lines.map((line) => ({
            id: line.id,
            lineNumber: line.lineNumber,
            itemId: line.itemId,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPercentage: line.discountPercentage,
            subtotal: line.subtotal,
            taxes: {
              create: line.taxes.map((tax) => ({
                taxId: tax.taxId,
                rate: tax.rate,
                amount: tax.amount,
              })),
            },
          })),
        },
      },
      ...WITH_LINES,
    });
    return VoucherMapper.toDomain(raw);
  }

  async findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<VoucherEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).voucher.findFirst({
      where: { id, companyId },
      ...WITH_LINES,
    });
    return raw ? VoucherMapper.toDomain(raw) : null;
  }

  async findAllByCompany(
    companyId: string,
    filters: ListVouchersFilters,
  ): Promise<VoucherEntity[]> {
    const where: Prisma.VoucherWhereInput = { companyId };
    if (filters.partyId) {
      where.partyId = filters.partyId;
    }
    if (filters.voucherTypeId) {
      where.voucherTypeId = filters.voucherTypeId;
    }
    if (filters.from || filters.to) {
      where.issueDate = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      };
    }
    const raws = await this.prisma.voucher.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...WITH_LINES,
    });
    return raws.map(VoucherMapper.toDomain);
  }
}
