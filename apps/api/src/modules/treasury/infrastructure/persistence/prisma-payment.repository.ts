import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  PaymentRepository,
  CreatePaymentInput,
  ListPaymentsFilters,
} from '../../domain/repositories/payment.repository';
import { PaymentEntity } from '../../domain/entities/payment.entity';
import { PaymentMapper } from '../mappers/payment.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

const WITH_RELATIONS = {
  include: { allocations: true, methodDetails: { include: { checkDetail: true, cardDetail: true } } },
} as const;

@Injectable()
export class PrismaPaymentRepository extends PaymentRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreatePaymentInput, ctx?: TransactionContext): Promise<PaymentEntity> {
    const client = resolveClient(this.prisma, ctx);

    // CheckDetail/CardDetail se crean aparte y se enlazan por FK escalar
    // (checkDetailId/cardDetailId) — Prisma no permite mezclar un FK
    // escalar (paymentMethodId) con un `create` anidado por relación en el
    // mismo objeto de escritura (exige un único estilo, "checked" o
    // "unchecked"; el resto del código usa FKs escalares consistentemente).
    const methodDetailsData = await Promise.all(
      input.methodDetails.map(async (detail) => {
        const checkDetailId = detail.checkDetail
          ? (
              await client.checkDetail.create({
                data: {
                  number: detail.checkDetail.number,
                  bankName: detail.checkDetail.bankName,
                  dueDate: detail.checkDetail.dueDate,
                },
              })
            ).id
          : undefined;
        const cardDetailId = detail.cardDetail
          ? (
              await client.cardDetail.create({
                data: {
                  authorizationCode: detail.cardDetail.authorizationCode,
                  batchNumber: detail.cardDetail.batchNumber,
                  settlementEntity: detail.cardDetail.settlementEntity,
                },
              })
            ).id
          : undefined;
        return {
          id: detail.id,
          paymentMethodId: detail.paymentMethodId,
          amount: detail.amount,
          reference: detail.reference,
          checkDetailId,
          cardDetailId,
        };
      }),
    );

    const raw = await client.payment.create({
      data: {
        id: input.id,
        companyId: input.companyId,
        partyId: input.partyId,
        direction: input.direction,
        date: input.date,
        currency: input.currency,
        exchangeRate: input.exchangeRate,
        totalAmount: input.totalAmount,
        createdByUserId: input.createdByUserId,
        idempotencyKey: input.idempotencyKey,
        allocations: {
          create: input.allocations.map((allocation) => ({
            id: allocation.id,
            voucherId: allocation.voucherId,
            amountApplied: allocation.amountApplied,
          })),
        },
        methodDetails: { create: methodDetailsData },
      },
      ...WITH_RELATIONS,
    });
    return PaymentMapper.toDomain(raw);
  }

  async findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<PaymentEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).payment.findFirst({
      where: { id, companyId },
      ...WITH_RELATIONS,
    });
    return raw ? PaymentMapper.toDomain(raw) : null;
  }

  async findAllByCompany(
    companyId: string,
    filters: ListPaymentsFilters,
  ): Promise<PaymentEntity[]> {
    const where: Prisma.PaymentWhereInput = { companyId };
    if (filters.partyId) {
      where.partyId = filters.partyId;
    }
    if (filters.direction) {
      where.direction = filters.direction;
    }
    if (filters.from || filters.to) {
      where.date = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      };
    }
    const raws = await this.prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...WITH_RELATIONS,
    });
    return raws.map(PaymentMapper.toDomain);
  }

  async sumAllocatedAmountForVoucher(
    voucherId: string,
    ctx?: TransactionContext,
  ): Promise<string> {
    const result = await resolveClient(this.prisma, ctx).paymentAllocation.aggregate({
      where: { voucherId },
      _sum: { amountApplied: true },
    });
    return (result._sum.amountApplied ?? new Prisma.Decimal(0)).toString();
  }

  async findByIdempotencyKey(
    companyId: string,
    idempotencyKey: string,
    ctx?: TransactionContext,
  ): Promise<PaymentEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).payment.findFirst({
      where: { companyId, idempotencyKey },
      ...WITH_RELATIONS,
    });
    return raw ? PaymentMapper.toDomain(raw) : null;
  }
}
