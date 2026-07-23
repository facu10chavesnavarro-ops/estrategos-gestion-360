import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  CustomerRepository,
  CreateCustomerInput,
  UpdateCustomerInput,
  ListCustomersFilters,
} from '../../domain/repositories/customer.repository';
import { CustomerEntity } from '../../domain/entities/customer.entity';
import { CustomerMapper } from '../mappers/customer.mapper';

const WITH_PARTY = { include: { party: true } } as const;

@Injectable()
export class PrismaCustomerRepository extends CustomerRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreateCustomerInput): Promise<CustomerEntity> {
    const raw = await this.prisma.customer.create({
      data: {
        partyId: input.partyId,
        companyId: input.companyId,
        paymentTermDays: input.paymentTermDays,
        creditLimit: input.creditLimit,
      },
      ...WITH_PARTY,
    });
    return CustomerMapper.toDomain(raw);
  }

  async findById(id: string, companyId: string): Promise<CustomerEntity | null> {
    const raw = await this.prisma.customer.findFirst({
      where: { id, companyId },
      ...WITH_PARTY,
    });
    return raw ? CustomerMapper.toDomain(raw) : null;
  }

  async findByPartyId(partyId: string): Promise<CustomerEntity | null> {
    const raw = await this.prisma.customer.findUnique({
      where: { partyId },
      ...WITH_PARTY,
    });
    return raw ? CustomerMapper.toDomain(raw) : null;
  }

  async findAllByCompany(
    companyId: string,
    filters: ListCustomersFilters,
  ): Promise<CustomerEntity[]> {
    const where: Prisma.CustomerWhereInput = { companyId };
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
    const raws = await this.prisma.customer.findMany({ where, ...WITH_PARTY });
    return raws.map(CustomerMapper.toDomain);
  }

  async update(id: string, input: UpdateCustomerInput): Promise<CustomerEntity> {
    const raw = await this.prisma.customer.update({
      where: { id },
      data: input,
      ...WITH_PARTY,
    });
    return CustomerMapper.toDomain(raw);
  }

  async setActive(id: string, isActive: boolean): Promise<CustomerEntity> {
    const raw = await this.prisma.customer.update({
      where: { id },
      data: { isActive },
      ...WITH_PARTY,
    });
    return CustomerMapper.toDomain(raw);
  }
}
