import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  BranchRepository,
  CreateBranchInput,
  UpdateBranchInput,
} from '../../domain/repositories/branch.repository';
import { BranchEntity } from '../../domain/entities/branch.entity';
import { BranchMapper } from '../mappers/branch.mapper';

@Injectable()
export class PrismaBranchRepository extends BranchRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreateBranchInput): Promise<BranchEntity> {
    const raw = await this.prisma.branch.create({ data: input });
    return BranchMapper.toDomain(raw);
  }

  async findById(id: string): Promise<BranchEntity | null> {
    const raw = await this.prisma.branch.findUnique({ where: { id } });
    return raw ? BranchMapper.toDomain(raw) : null;
  }

  async findAllByCompany(companyId: string): Promise<BranchEntity[]> {
    const raws = await this.prisma.branch.findMany({ where: { companyId } });
    return raws.map(BranchMapper.toDomain);
  }

  async update(id: string, input: UpdateBranchInput): Promise<BranchEntity> {
    const raw = await this.prisma.branch.update({ where: { id }, data: input });
    return BranchMapper.toDomain(raw);
  }

  async setActive(id: string, isActive: boolean): Promise<BranchEntity> {
    const raw = await this.prisma.branch.update({
      where: { id },
      data: { isActive },
    });
    return BranchMapper.toDomain(raw);
  }
}
