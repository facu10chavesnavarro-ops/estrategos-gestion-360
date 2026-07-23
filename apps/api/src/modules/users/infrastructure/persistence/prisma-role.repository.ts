import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { RoleEntity } from '../../domain/entities/role.entity';
import { RoleMapper } from '../mappers/role.mapper';

@Injectable()
export class PrismaRoleRepository extends RoleRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findAll(): Promise<RoleEntity[]> {
    const raws = await this.prisma.role.findMany({ orderBy: { name: 'asc' } });
    return raws.map(RoleMapper.toDomain);
  }

  async findById(id: string): Promise<RoleEntity | null> {
    const raw = await this.prisma.role.findUnique({ where: { id } });
    return raw ? RoleMapper.toDomain(raw) : null;
  }
}
