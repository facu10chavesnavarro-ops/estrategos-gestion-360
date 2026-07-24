import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  CompanyRepository,
  CreateCompanyInput,
  UpdateCompanyInput,
} from '../../domain/repositories/company.repository';
import { CompanyEntity } from '../../domain/entities/company.entity';
import { CompanyMapper } from '../mappers/company.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaCompanyRepository extends CompanyRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreateCompanyInput, ctx?: TransactionContext): Promise<CompanyEntity> {
    const raw = await resolveClient(this.prisma, ctx).company.create({ data: input });
    return CompanyMapper.toDomain(raw);
  }

  async findAllForUser(userId: string): Promise<CompanyEntity[]> {
    const memberships = await this.prisma.companyUser.findMany({
      where: { userId },
      include: { company: true },
    });
    return memberships.map((m) => CompanyMapper.toDomain(m.company));
  }

  async findById(id: string, ctx?: TransactionContext): Promise<CompanyEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).company.findUnique({ where: { id } });
    return raw ? CompanyMapper.toDomain(raw) : null;
  }

  async update(
    id: string,
    input: UpdateCompanyInput,
    ctx?: TransactionContext,
  ): Promise<CompanyEntity> {
    const raw = await resolveClient(this.prisma, ctx).company.update({
      where: { id },
      data: input,
    });
    return CompanyMapper.toDomain(raw);
  }

  async setActive(
    id: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<CompanyEntity> {
    const raw = await resolveClient(this.prisma, ctx).company.update({
      where: { id },
      data: { isActive },
    });
    return CompanyMapper.toDomain(raw);
  }
}
