import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  SupplierRepository,
  CreateSupplierInput,
  UpdateSupplierInput,
  ListSuppliersFilters,
} from '../../domain/repositories/supplier.repository';
import { SupplierEntity } from '../../domain/entities/supplier.entity';
import { SupplierMapper } from '../mappers/supplier.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

const WITH_PARTY = { include: { party: true } } as const;

@Injectable()
export class PrismaSupplierRepository extends SupplierRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreateSupplierInput, ctx?: TransactionContext): Promise<SupplierEntity> {
    const raw = await resolveClient(this.prisma, ctx).supplier.create({
      data: {
        partyId: input.partyId,
        companyId: input.companyId,
        paymentTermDays: input.paymentTermDays,
        bankName: input.bankName,
        bankAccountHolder: input.bankAccountHolder,
        bankCbu: input.bankCbu,
      },
      ...WITH_PARTY,
    });
    return SupplierMapper.toDomain(raw);
  }

  async findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<SupplierEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).supplier.findFirst({
      where: { id, companyId },
      ...WITH_PARTY,
    });
    return raw ? SupplierMapper.toDomain(raw) : null;
  }

  async findByPartyId(
    partyId: string,
    ctx?: TransactionContext,
  ): Promise<SupplierEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).supplier.findUnique({
      where: { partyId },
      ...WITH_PARTY,
    });
    return raw ? SupplierMapper.toDomain(raw) : null;
  }

  async findAllByCompany(
    companyId: string,
    filters: ListSuppliersFilters,
  ): Promise<SupplierEntity[]> {
    const where: Prisma.SupplierWhereInput = { companyId };
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters.search) {
      where.party = {
        OR: [
          { legalName: { contains: filters.search, mode: 'insensitive' } },
          { taxId: { contains: filters.search } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ],
      };
    }
    const raws = await this.prisma.supplier.findMany({ where, ...WITH_PARTY });
    return raws.map(SupplierMapper.toDomain);
  }

  async update(
    id: string,
    input: UpdateSupplierInput,
    ctx?: TransactionContext,
  ): Promise<SupplierEntity> {
    const raw = await resolveClient(this.prisma, ctx).supplier.update({
      where: { id },
      data: input,
      ...WITH_PARTY,
    });
    return SupplierMapper.toDomain(raw);
  }

  async setActive(
    id: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<SupplierEntity> {
    const raw = await resolveClient(this.prisma, ctx).supplier.update({
      where: { id },
      data: { isActive },
      ...WITH_PARTY,
    });
    return SupplierMapper.toDomain(raw);
  }
}
