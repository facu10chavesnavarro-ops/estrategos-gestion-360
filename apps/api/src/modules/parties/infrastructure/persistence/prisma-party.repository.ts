import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  PartyRepository,
  CreatePartyInput,
  UpdatePartyInput,
} from '../../domain/repositories/party.repository';
import { PartyEntity } from '../../domain/entities/party.entity';
import { PartyMapper } from '../mappers/party.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaPartyRepository extends PartyRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreatePartyInput, ctx?: TransactionContext): Promise<PartyEntity> {
    const raw = await resolveClient(this.prisma, ctx).party.create({ data: input });
    return PartyMapper.toDomain(raw);
  }

  async findById(id: string, ctx?: TransactionContext): Promise<PartyEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).party.findUnique({ where: { id } });
    return raw ? PartyMapper.toDomain(raw) : null;
  }

  async findByTaxId(
    companyId: string,
    taxId: string,
    ctx?: TransactionContext,
  ): Promise<PartyEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).party.findUnique({
      where: { companyId_taxId: { companyId, taxId } },
    });
    return raw ? PartyMapper.toDomain(raw) : null;
  }

  async update(
    id: string,
    input: UpdatePartyInput,
    ctx?: TransactionContext,
  ): Promise<PartyEntity> {
    const raw = await resolveClient(this.prisma, ctx).party.update({
      where: { id },
      data: input,
    });
    return PartyMapper.toDomain(raw);
  }
}
