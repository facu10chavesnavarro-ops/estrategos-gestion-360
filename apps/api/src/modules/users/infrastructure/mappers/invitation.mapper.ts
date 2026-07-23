import { Invitation as PrismaInvitation } from '@prisma/client';
import { InvitationEntity } from '../../domain/entities/invitation.entity';

export class InvitationMapper {
  static toDomain(raw: PrismaInvitation): InvitationEntity {
    return new InvitationEntity(
      raw.id,
      raw.companyId,
      raw.email,
      raw.roleId,
      raw.invitedByUserId,
      raw.revokedByUserId,
      raw.expiresAt,
      raw.acceptedAt,
      raw.revokedAt,
      raw.createdAt,
    );
  }
}
