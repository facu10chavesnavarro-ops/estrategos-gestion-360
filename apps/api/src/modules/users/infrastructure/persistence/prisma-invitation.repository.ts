import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  InvitationRepository,
  CreateInvitationInput,
} from '../../domain/repositories/invitation.repository';
import { InvitationEntity } from '../../domain/entities/invitation.entity';
import { InvitationMapper } from '../mappers/invitation.mapper';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaInvitationRepository extends InvitationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(
    input: CreateInvitationInput,
    ctx?: TransactionContext,
  ): Promise<InvitationEntity> {
    const raw = await resolveClient(this.prisma, ctx).invitation.create({ data: input });
    return InvitationMapper.toDomain(raw);
  }

  async findById(id: string, ctx?: TransactionContext): Promise<InvitationEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).invitation.findUnique({ where: { id } });
    return raw ? InvitationMapper.toDomain(raw) : null;
  }

  async findByTokenHash(
    tokenHash: string,
    ctx?: TransactionContext,
  ): Promise<InvitationEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).invitation.findFirst({
      where: { tokenHash },
    });
    return raw ? InvitationMapper.toDomain(raw) : null;
  }

  async findPendingByEmailAndCompany(
    email: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<InvitationEntity | null> {
    const raw = await resolveClient(this.prisma, ctx).invitation.findFirst({
      where: {
        email,
        companyId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    return raw ? InvitationMapper.toDomain(raw) : null;
  }

  async findAllByCompany(companyId: string): Promise<InvitationEntity[]> {
    const raws = await this.prisma.invitation.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
    return raws.map(InvitationMapper.toDomain);
  }

  async markAccepted(id: string, ctx?: TransactionContext): Promise<void> {
    await resolveClient(this.prisma, ctx).invitation.update({
      where: { id },
      data: { acceptedAt: new Date() },
    });
  }

  async markRevoked(
    id: string,
    revokedByUserId: string,
    ctx?: TransactionContext,
  ): Promise<void> {
    await resolveClient(this.prisma, ctx).invitation.update({
      where: { id },
      data: { revokedAt: new Date(), revokedByUserId },
    });
  }
}
