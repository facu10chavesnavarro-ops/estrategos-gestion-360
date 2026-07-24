import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  UserRepository,
  CreateUserInput,
} from '../../domain/repositories/user.repository';
import { UserEntity } from '../../domain/entities/user.entity';
import { UserMapper } from '../mappers/user.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByEmail(email: string, ctx?: TransactionContext): Promise<UserEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).user.findUnique({ where: { email } });
    return raw ? UserMapper.toDomain(raw) : null;
  }

  async findById(id: string, ctx?: TransactionContext): Promise<UserEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).user.findUnique({ where: { id } });
    return raw ? UserMapper.toDomain(raw) : null;
  }

  async updateLastLogin(id: string, ctx?: TransactionContext): Promise<void> {
    await resolveClient(this.prisma, ctx).user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async create(input: CreateUserInput, ctx?: TransactionContext): Promise<UserEntity> {
    const raw = await resolveClient(this.prisma, ctx).user.create({ data: input });
    return UserMapper.toDomain(raw);
  }
}
