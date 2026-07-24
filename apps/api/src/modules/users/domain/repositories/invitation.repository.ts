import { InvitationEntity } from '../entities/invitation.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreateInvitationInput {
  companyId: string;
  email: string;
  roleId: string;
  tokenHash: string;
  invitedByUserId: string;
  expiresAt: Date;
}

export abstract class InvitationRepository {
  abstract create(
    input: CreateInvitationInput,
    ctx?: TransactionContext,
  ): Promise<InvitationEntity>;
  abstract findById(id: string, ctx?: TransactionContext): Promise<InvitationEntity | null>;
  abstract findByTokenHash(
    tokenHash: string,
    ctx?: TransactionContext,
  ): Promise<InvitationEntity | null>;
  abstract findPendingByEmailAndCompany(
    email: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<InvitationEntity | null>;
  abstract findAllByCompany(companyId: string): Promise<InvitationEntity[]>;
  abstract markAccepted(id: string, ctx?: TransactionContext): Promise<void>;
  abstract markRevoked(
    id: string,
    revokedByUserId: string,
    ctx?: TransactionContext,
  ): Promise<void>;
}
