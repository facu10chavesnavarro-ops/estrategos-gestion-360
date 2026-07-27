import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  CashMovementRepository,
  CreateCashMovementInput,
} from '../../domain/repositories/cash-movement.repository';
import { CashMovementEntity, CashMovementType } from '../../domain/entities/cash-movement.entity';
import { CashMovementMapper } from '../mappers/cash-movement.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaCashMovementRepository extends CashMovementRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(
    input: CreateCashMovementInput,
    ctx?: TransactionContext,
  ): Promise<CashMovementEntity> {
    const raw = await resolveClient(this.prisma, ctx).cashMovement.create({
      data: {
        id: input.id,
        cashSessionId: input.cashSessionId,
        type: input.type,
        amount: input.amount,
        paymentId: input.paymentId,
        reason: input.reason,
      },
    });
    return CashMovementMapper.toDomain(raw);
  }

  async findAllBySession(cashSessionId: string): Promise<CashMovementEntity[]> {
    const raws = await this.prisma.cashMovement.findMany({
      where: { cashSessionId },
      orderBy: { createdAt: 'desc' },
    });
    return raws.map(CashMovementMapper.toDomain);
  }

  async sumAmountBySessionAndType(
    cashSessionId: string,
    type: CashMovementType,
    ctx?: TransactionContext,
  ): Promise<string> {
    const result = await resolveClient(this.prisma, ctx).cashMovement.aggregate({
      where: { cashSessionId, type },
      _sum: { amount: true },
    });
    return (result._sum.amount ?? new Prisma.Decimal(0)).toString();
  }
}
