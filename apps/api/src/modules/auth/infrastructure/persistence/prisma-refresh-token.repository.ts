import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  RefreshTokenRepository,
  CreateRefreshTokenInput,
} from '../../domain/repositories/refresh-token.repository';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaRefreshTokenRepository extends RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreateRefreshTokenInput, ctx?: TransactionContext): Promise<void> {
    await resolveClient(this.prisma, ctx).refreshToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      },
    });
  }

  async findValidByUserAndHash(
    userId: string,
    tokenHash: string,
    ctx?: TransactionContext,
  ): Promise<{ id: string } | null> {
    const record = await resolveClient(this.prisma, ctx).refreshToken.findFirst({
      where: {
        userId,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    return record;
  }

  async revoke(id: string, ctx?: TransactionContext): Promise<void> {
    await resolveClient(this.prisma, ctx).refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }
}
