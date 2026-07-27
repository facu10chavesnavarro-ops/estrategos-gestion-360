import {
  Payment as PrismaPayment,
  PaymentAllocation as PrismaPaymentAllocation,
  PaymentMethodDetail as PrismaPaymentMethodDetail,
  CheckDetail as PrismaCheckDetail,
  CardDetail as PrismaCardDetail,
} from '@prisma/client';
import {
  PaymentEntity,
  PaymentDirection,
  CheckStatus,
  CheckDetailData,
  CardDetailData,
  PaymentMethodDetailData,
  PaymentAllocationData,
} from '../../domain/entities/payment.entity';

type PrismaPaymentMethodDetailWithDetails = PrismaPaymentMethodDetail & {
  checkDetail: PrismaCheckDetail | null;
  cardDetail: PrismaCardDetail | null;
};
export type PrismaPaymentWithRelations = PrismaPayment & {
  allocations: PrismaPaymentAllocation[];
  methodDetails: PrismaPaymentMethodDetailWithDetails[];
};

export class PaymentMapper {
  static toDomain(raw: PrismaPaymentWithRelations): PaymentEntity {
    return new PaymentEntity(
      raw.id,
      raw.companyId,
      raw.partyId,
      raw.direction as PaymentDirection,
      raw.date,
      raw.currency,
      raw.exchangeRate.toString(),
      raw.totalAmount.toString(),
      raw.createdByUserId,
      raw.createdAt,
      raw.allocations.map(
        (allocation): PaymentAllocationData => ({
          voucherId: allocation.voucherId,
          amountApplied: allocation.amountApplied.toString(),
        }),
      ),
      raw.methodDetails.map((detail): PaymentMethodDetailData => {
        const checkDetail: CheckDetailData | null = detail.checkDetail
          ? {
              id: detail.checkDetail.id,
              number: detail.checkDetail.number,
              bankName: detail.checkDetail.bankName,
              dueDate: detail.checkDetail.dueDate,
              status: detail.checkDetail.status as CheckStatus,
            }
          : null;
        const cardDetail: CardDetailData | null = detail.cardDetail
          ? {
              id: detail.cardDetail.id,
              authorizationCode: detail.cardDetail.authorizationCode,
              batchNumber: detail.cardDetail.batchNumber,
              settlementEntity: detail.cardDetail.settlementEntity,
            }
          : null;
        return {
          id: detail.id,
          paymentMethodId: detail.paymentMethodId,
          amount: detail.amount.toString(),
          reference: detail.reference,
          checkDetail,
          cardDetail,
        };
      }),
    );
  }
}
