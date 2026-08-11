import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  WarehouseRepository,
  CreateWarehouseInput,
  UpdateWarehouseInput,
} from '../../domain/repositories/warehouse.repository';
import { WarehouseEntity } from '../../domain/entities/warehouse.entity';
import { WarehouseMapper } from '../mappers/warehouse.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaWarehouseRepository extends WarehouseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(
    input: CreateWarehouseInput,
    ctx?: TransactionContext,
  ): Promise<WarehouseEntity> {
    const raw = await resolveClient(this.prisma, ctx).warehouse.create({
      data: { companyId: input.companyId, branchId: input.branchId, name: input.name },
    });
    return WarehouseMapper.toDomain(raw);
  }

  async findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<WarehouseEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).warehouse.findFirst({
      where: { id, companyId },
    });
    return raw ? WarehouseMapper.toDomain(raw) : null;
  }

  async findByBranchAndName(
    branchId: string,
    name: string,
    ctx?: TransactionContext,
  ): Promise<WarehouseEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).warehouse.findUnique({
      where: { branchId_name: { branchId, name } },
    });
    return raw ? WarehouseMapper.toDomain(raw) : null;
  }

  async findAllByBranch(branchId: string, companyId: string): Promise<WarehouseEntity[]> {
    const raws = await this.prisma.warehouse.findMany({
      where: { branchId, companyId },
      orderBy: { name: 'asc' },
    });
    return raws.map(WarehouseMapper.toDomain);
  }

  async update(
    id: string,
    input: UpdateWarehouseInput,
    ctx?: TransactionContext,
  ): Promise<WarehouseEntity> {
    const raw = await resolveClient(this.prisma, ctx).warehouse.update({
      where: { id },
      data: input,
    });
    return WarehouseMapper.toDomain(raw);
  }

  async setActive(
    id: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<WarehouseEntity> {
    const raw = await resolveClient(this.prisma, ctx).warehouse.update({
      where: { id },
      data: { isActive },
    });
    return WarehouseMapper.toDomain(raw);
  }
}
