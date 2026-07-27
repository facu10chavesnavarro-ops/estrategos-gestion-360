import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  SupplierAccountRepository,
  UpsertSupplierAccountInput,
  SupplierAccountMovementRepository,
  CreateSupplierAccountMovementInput,
} from '../../domain/repositories/supplier-account.repository';
import {
  SupplierAccountEntity,
  SupplierAccountMovementEntity,
} from '../../domain/entities/supplier-account.entity';
import { SupplierAccountMapper, SupplierAccountMovementMapper } from '../mappers/supplier-account.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaSupplierAccountRepository extends SupplierAccountRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findBySupplierId(
    supplierId: string,
    ctx?: TransactionContext,
  ): Promise<SupplierAccountEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).supplierAccount.findUnique({
      where: { supplierId },
    });
    return raw ? SupplierAccountMapper.toDomain(raw) : null;
  }

  async upsert(
    input: UpsertSupplierAccountInput,
    ctx?: TransactionContext,
  ): Promise<SupplierAccountEntity> {
    const raw = await resolveClient(this.prisma, ctx).supplierAccount.upsert({
      where: { supplierId: input.supplierId },
      create: {
        companyId: input.companyId,
        supplierId: input.supplierId,
        currentBalance: input.currentBalance,
      },
      update: { currentBalance: input.currentBalance },
    });
    return SupplierAccountMapper.toDomain(raw);
  }
}

@Injectable()
export class PrismaSupplierAccountMovementRepository extends SupplierAccountMovementRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(
    input: CreateSupplierAccountMovementInput,
    ctx?: TransactionContext,
  ): Promise<SupplierAccountMovementEntity> {
    const raw = await resolveClient(this.prisma, ctx).supplierAccountMovement.create({
      data: {
        id: input.id,
        supplierAccountId: input.supplierAccountId,
        type: input.type,
        amount: input.amount,
        balanceAfter: input.balanceAfter,
        voucherId: input.voucherId,
        paymentId: input.paymentId,
      },
    });
    return SupplierAccountMovementMapper.toDomain(raw);
  }

  async findAllByAccount(supplierAccountId: string): Promise<SupplierAccountMovementEntity[]> {
    const raws = await this.prisma.supplierAccountMovement.findMany({
      where: { supplierAccountId },
      orderBy: { createdAt: 'desc' },
    });
    return raws.map(SupplierAccountMovementMapper.toDomain);
  }
}
