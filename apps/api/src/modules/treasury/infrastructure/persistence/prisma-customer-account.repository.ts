import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  CustomerAccountRepository,
  UpsertCustomerAccountInput,
  CustomerAccountMovementRepository,
  CreateCustomerAccountMovementInput,
} from '../../domain/repositories/customer-account.repository';
import {
  CustomerAccountEntity,
  CustomerAccountMovementEntity,
} from '../../domain/entities/customer-account.entity';
import { CustomerAccountMapper, CustomerAccountMovementMapper } from '../mappers/customer-account.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaCustomerAccountRepository extends CustomerAccountRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByCustomerId(
    customerId: string,
    ctx?: TransactionContext,
  ): Promise<CustomerAccountEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).customerAccount.findUnique({
      where: { customerId },
    });
    return raw ? CustomerAccountMapper.toDomain(raw) : null;
  }

  async upsert(
    input: UpsertCustomerAccountInput,
    ctx?: TransactionContext,
  ): Promise<CustomerAccountEntity> {
    const raw = await resolveClient(this.prisma, ctx).customerAccount.upsert({
      where: { customerId: input.customerId },
      create: {
        companyId: input.companyId,
        customerId: input.customerId,
        currentBalance: input.currentBalance,
      },
      update: { currentBalance: input.currentBalance },
    });
    return CustomerAccountMapper.toDomain(raw);
  }
}

@Injectable()
export class PrismaCustomerAccountMovementRepository extends CustomerAccountMovementRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(
    input: CreateCustomerAccountMovementInput,
    ctx?: TransactionContext,
  ): Promise<CustomerAccountMovementEntity> {
    const raw = await resolveClient(this.prisma, ctx).customerAccountMovement.create({
      data: {
        id: input.id,
        customerAccountId: input.customerAccountId,
        type: input.type,
        amount: input.amount,
        balanceAfter: input.balanceAfter,
        voucherId: input.voucherId,
        paymentId: input.paymentId,
      },
    });
    return CustomerAccountMovementMapper.toDomain(raw);
  }

  async findAllByAccount(customerAccountId: string): Promise<CustomerAccountMovementEntity[]> {
    const raws = await this.prisma.customerAccountMovement.findMany({
      where: { customerAccountId },
      orderBy: { createdAt: 'desc' },
    });
    return raws.map(CustomerAccountMovementMapper.toDomain);
  }
}
