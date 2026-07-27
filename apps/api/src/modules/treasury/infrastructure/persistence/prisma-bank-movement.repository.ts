import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  BankMovementRepository,
  CreateBankMovementInput,
} from '../../domain/repositories/bank-movement.repository';
import { BankMovementEntity } from '../../domain/entities/bank-movement.entity';
import { BankMovementMapper } from '../mappers/bank-movement.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaBankMovementRepository extends BankMovementRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(
    input: CreateBankMovementInput,
    ctx?: TransactionContext,
  ): Promise<BankMovementEntity> {
    const raw = await resolveClient(this.prisma, ctx).bankMovement.create({
      data: {
        id: input.id,
        bankAccountId: input.bankAccountId,
        type: input.type,
        amount: input.amount,
        paymentId: input.paymentId,
        description: input.description,
        date: input.date,
      },
    });
    return BankMovementMapper.toDomain(raw);
  }

  async findAllByAccount(bankAccountId: string): Promise<BankMovementEntity[]> {
    const raws = await this.prisma.bankMovement.findMany({
      where: { bankAccountId },
      orderBy: { date: 'desc' },
    });
    return raws.map(BankMovementMapper.toDomain);
  }
}
