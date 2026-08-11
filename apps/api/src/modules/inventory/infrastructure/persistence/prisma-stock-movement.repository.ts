import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  StockMovementRepository,
  CreateStockMovementInput,
  ListStockMovementsFilters,
} from '../../domain/repositories/stock-movement.repository';
import { StockMovementEntity } from '../../domain/entities/stock-movement.entity';
import { StockMovementMapper } from '../mappers/stock-movement.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaStockMovementRepository extends StockMovementRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(
    input: CreateStockMovementInput,
    ctx?: TransactionContext,
  ): Promise<StockMovementEntity> {
    const raw = await resolveClient(this.prisma, ctx).stockMovement.create({
      data: {
        id: input.id,
        companyId: input.companyId,
        itemId: input.itemId,
        warehouseId: input.warehouseId,
        type: input.type,
        quantity: input.quantity,
        unitCost: input.unitCost,
        reason: input.reason,
        transferGroupId: input.transferGroupId,
        voucherId: input.voucherId,
        userId: input.userId,
      },
    });
    return StockMovementMapper.toDomain(raw);
  }

  async findAllByWarehouse(
    warehouseId: string,
    companyId: string,
    filters: ListStockMovementsFilters,
  ): Promise<StockMovementEntity[]> {
    const where: Prisma.StockMovementWhereInput = { warehouseId, companyId };
    if (filters.itemId) {
      where.itemId = filters.itemId;
    }
    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.voucherId) {
      where.voucherId = filters.voucherId;
    }
    if (filters.from || filters.to) {
      where.createdAt = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      };
    }
    const raws = await this.prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return raws.map(StockMovementMapper.toDomain);
  }
}
