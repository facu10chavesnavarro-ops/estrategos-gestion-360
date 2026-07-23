import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  PartyRepository,
  CreatePartyInput,
  UpdatePartyInput,
} from '../../domain/repositories/party.repository';
import { PartyEntity } from '../../domain/entities/party.entity';
import { PartyMapper } from '../mappers/party.mapper';

@Injectable()
export class PrismaPartyRepository extends PartyRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreatePartyInput): Promise<PartyEntity> {
    const raw = await this.prisma.party.create({ data: input });
    return PartyMapper.toDomain(raw);
  }

  async findById(id: string): Promise<PartyEntity | null> {
    const raw = await this.prisma.party.findUnique({ where: { id } });
    return raw ? PartyMapper.toDomain(raw) : null;
  }

  async findByTaxId(companyId: string, taxId: string): Promise<PartyEntity | null> {
    const raw = await this.prisma.party.findUnique({
      where: { companyId_taxId: { companyId, taxId } },
    });
    return raw ? PartyMapper.toDomain(raw) : null;
  }

  async update(id: string, input: UpdatePartyInput): Promise<PartyEntity> {
    const raw = await this.prisma.party.update({ where: { id }, data: input });
    return PartyMapper.toDomain(raw);
  }
}
