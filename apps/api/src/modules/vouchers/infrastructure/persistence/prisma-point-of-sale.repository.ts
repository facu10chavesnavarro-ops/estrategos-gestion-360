import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  PointOfSaleRepository,
  CreatePointOfSaleInput,
  UpdatePointOfSaleInput,
} from '../../domain/repositories/point-of-sale.repository';
import { PointOfSaleEntity } from '../../domain/entities/point-of-sale.entity';
import { PointOfSaleMapper } from '../mappers/point-of-sale.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaPointOfSaleRepository extends PointOfSaleRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(
    input: CreatePointOfSaleInput,
    ctx?: TransactionContext,
  ): Promise<PointOfSaleEntity> {
    const raw = await resolveClient(this.prisma, ctx).pointOfSale.create({
      data: {
        companyId: input.companyId,
        branchId: input.branchId,
        code: input.code,
        name: input.name,
      },
    });
    return PointOfSaleMapper.toDomain(raw);
  }

  async findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<PointOfSaleEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).pointOfSale.findFirst({
      where: { id, companyId },
    });
    return raw ? PointOfSaleMapper.toDomain(raw) : null;
  }

  async findByCompanyAndCode(
    companyId: string,
    code: string,
    ctx?: TransactionContext,
  ): Promise<PointOfSaleEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).pointOfSale.findUnique({
      where: { companyId_code: { companyId, code } },
    });
    return raw ? PointOfSaleMapper.toDomain(raw) : null;
  }

  async findAllByBranch(branchId: string): Promise<PointOfSaleEntity[]> {
    const raws = await this.prisma.pointOfSale.findMany({
      where: { branchId },
      orderBy: { code: 'asc' },
    });
    return raws.map(PointOfSaleMapper.toDomain);
  }

  async update(
    id: string,
    input: UpdatePointOfSaleInput,
    ctx?: TransactionContext,
  ): Promise<PointOfSaleEntity> {
    const raw = await resolveClient(this.prisma, ctx).pointOfSale.update({
      where: { id },
      data: input,
    });
    return PointOfSaleMapper.toDomain(raw);
  }

  async setActive(
    id: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<PointOfSaleEntity> {
    const raw = await resolveClient(this.prisma, ctx).pointOfSale.update({
      where: { id },
      data: { isActive },
    });
    return PointOfSaleMapper.toDomain(raw);
  }
}
