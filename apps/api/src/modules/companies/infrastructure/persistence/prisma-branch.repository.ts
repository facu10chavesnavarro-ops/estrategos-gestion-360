import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  BranchRepository,
  CreateBranchInput,
  UpdateBranchInput,
} from '../../domain/repositories/branch.repository';
import { BranchEntity } from '../../domain/entities/branch.entity';
import { BranchMapper } from '../mappers/branch.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaBranchRepository extends BranchRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreateBranchInput, ctx?: TransactionContext): Promise<BranchEntity> {
    const raw = await resolveClient(this.prisma, ctx).branch.create({ data: input });
    return BranchMapper.toDomain(raw);
  }

  async findById(id: string, ctx?: TransactionContext): Promise<BranchEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).branch.findUnique({ where: { id } });
    return raw ? BranchMapper.toDomain(raw) : null;
  }

  async findAllByCompany(companyId: string): Promise<BranchEntity[]> {
    const raws = await this.prisma.branch.findMany({ where: { companyId } });
    return raws.map(BranchMapper.toDomain);
  }

  async update(
    id: string,
    input: UpdateBranchInput,
    ctx?: TransactionContext,
  ): Promise<BranchEntity> {
    const raw = await resolveClient(this.prisma, ctx).branch.update({
      where: { id },
      data: input,
    });
    return BranchMapper.toDomain(raw);
  }

  async setActive(
    id: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<BranchEntity> {
    const raw = await resolveClient(this.prisma, ctx).branch.update({
      where: { id },
      data: { isActive },
    });
    return BranchMapper.toDomain(raw);
  }
}
