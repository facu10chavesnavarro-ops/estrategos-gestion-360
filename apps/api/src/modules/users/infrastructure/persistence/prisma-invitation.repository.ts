import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  InvitationRepository,
  CreateInvitationInput,
} from '../../domain/repositories/invitation.repository';
import { InvitationEntity } from '../../domain/entities/invitation.entity';
import { InvitationMapper } from '../mappers/invitation.mapper';

@Injectable()
export class PrismaInvitationRepository extends InvitationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreateInvitationInput): Promise<InvitationEntity> {
    const raw = await this.prisma.invitation.create({ data: input });
    return InvitationMapper.toDomain(raw);
  }

  async findById(id: string): Promise<InvitationEntity | null> {
    const raw = await this.prisma.invitation.findUnique({ where: { id } });
    return raw ? InvitationMapper.toDomain(raw) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<InvitationEntity | null> {
    const raw = await this.prisma.invitation.findFirst({ where: { tokenHash } });
    return raw ? InvitationMapper.toDomain(raw) : null;
  }

  async findPendingByEmailAndCompany(
    email: string,
    companyId: string,
  ): Promise<InvitationEntity | null> {
    const raw = await this.prisma.invitation.findFirst({
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

  async markAccepted(id: string): Promise<void> {
    await this.prisma.invitation.update({
      where: { id },
      data: { acceptedAt: new Date() },
    });
  }

  async markRevoked(id: string, revokedByUserId: string): Promise<void> {
    await this.prisma.invitation.update({
      where: { id },
      data: { revokedAt: new Date(), revokedByUserId },
    });
  }
}
