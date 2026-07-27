import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import { PaymentMethodRepository } from '../../domain/repositories/payment-method.repository';
import { PaymentMethodEntity } from '../../domain/entities/payment-method.entity';
import { PaymentMethodMapper } from '../mappers/payment-method.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaPaymentMethodRepository extends PaymentMethodRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string, ctx?: TransactionContext): Promise<PaymentMethodEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).paymentMethod.findUnique({ where: { id } });
    return raw ? PaymentMethodMapper.toDomain(raw) : null;
  }

  async findAllActive(): Promise<PaymentMethodEntity[]> {
    const raws = await this.prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
    return raws.map(PaymentMethodMapper.toDomain);
  }
}
