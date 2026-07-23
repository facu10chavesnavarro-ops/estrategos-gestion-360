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

const WITH_PARTY = { include: { party: true } } as const;

@Injectable()
export class PrismaSupplierRepository extends SupplierRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreateSupplierInput): Promise<SupplierEntity> {
    const raw = await this.prisma.supplier.create({
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

  async findById(id: string, companyId: string): Promise<SupplierEntity | null> {
    const raw = await this.prisma.supplier.findFirst({
      where: { id, companyId },
      ...WITH_PARTY,
    });
    return raw ? SupplierMapper.toDomain(raw) : null;
  }

  async findByPartyId(partyId: string): Promise<SupplierEntity | null> {
    const raw = await this.prisma.supplier.findUnique({
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

  async update(id: string, input: UpdateSupplierInput): Promise<SupplierEntity> {
    const raw = await this.prisma.supplier.update({
      where: { id },
      data: input,
      ...WITH_PARTY,
    });
    return SupplierMapper.toDomain(raw);
  }

  async setActive(id: string, isActive: boolean): Promise<SupplierEntity> {
    const raw = await this.prisma.supplier.update({
      where: { id },
      data: { isActive },
      ...WITH_PARTY,
    });
    return SupplierMapper.toDomain(raw);
  }
}
