import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { RoleEntity } from '../../domain/entities/role.entity';
import { RoleMapper } from '../mappers/role.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaRoleRepository extends RoleRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findAll(): Promise<RoleEntity[]> {
    const raws = await this.prisma.role.findMany({ orderBy: { name: 'asc' } });
    return raws.map(RoleMapper.toDomain);
  }

  async findById(id: string, ctx?: TransactionContext): Promise<RoleEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).role.findUnique({ where: { id } });
    return raw ? RoleMapper.toDomain(raw) : null;
  }
}
