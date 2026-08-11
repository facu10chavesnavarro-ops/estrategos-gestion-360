import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  StockRepository,
  UpsertStockInput,
  ListStockFilters,
} from '../../domain/repositories/stock.repository';
import { StockEntity } from '../../domain/entities/stock.entity';
import { StockMapper } from '../mappers/stock.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaStockRepository extends StockRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByItemAndWarehouse(
    itemId: string,
    warehouseId: string,
    ctx?: TransactionContext,
  ): Promise<StockEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).stock.findUnique({
      where: { itemId_warehouseId: { itemId, warehouseId } },
    });
    return raw ? StockMapper.toDomain(raw) : null;
  }

  async findAllByWarehouse(
    warehouseId: string,
    companyId: string,
    filters: ListStockFilters,
  ): Promise<StockEntity[]> {
    const where: Prisma.StockWhereInput = { warehouseId, companyId };
    if (filters.itemId) {
      where.itemId = filters.itemId;
    }
    const raws = await this.prisma.stock.findMany({ where });
    return raws.map(StockMapper.toDomain);
  }

  async upsert(input: UpsertStockInput, ctx?: TransactionContext): Promise<StockEntity> {
    const raw = await resolveClient(this.prisma, ctx).stock.upsert({
      where: { itemId_warehouseId: { itemId: input.itemId, warehouseId: input.warehouseId } },
      create: {
        companyId: input.companyId,
        itemId: input.itemId,
        warehouseId: input.warehouseId,
        quantity: input.quantity,
        averageCost: input.averageCost,
      },
      update: {
        quantity: input.quantity,
        averageCost: input.averageCost,
      },
    });
    return StockMapper.toDomain(raw);
  }
}
