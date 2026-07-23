import { InvitationEntity } from '../entities/invitation.entity';

export interface CreateInvitationInput {
  companyId: string;
  email: string;
  roleId: string;
  tokenHash: string;
  invitedByUserId: string;
  expiresAt: Date;
}

export abstract class InvitationRepository {
  abstract create(input: CreateInvitationInput): Promise<InvitationEntity>;
  abstract findById(id: string): Promise<InvitationEntity | null>;
  abstract findByTokenHash(tokenHash: string): Promise<InvitationEntity | null>;
  abstract findPendingByEmailAndCompany(
    email: string,
    companyId: string,
  ): Promise<InvitationEntity | null>;
  abstract findAllByCompany(companyId: string): Promise<InvitationEntity[]>;
  abstract markAccepted(id: string): Promise<void>;
  abstract markRevoked(id: string, revokedByUserId: string): Promise<void>;
}
