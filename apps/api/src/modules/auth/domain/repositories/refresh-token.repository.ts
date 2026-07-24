import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreateRefreshTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export abstract class RefreshTokenRepository {
  abstract create(input: CreateRefreshTokenInput, ctx?: TransactionContext): Promise<void>;
  abstract findValidByUserAndHash(
    userId: string,
    tokenHash: string,
    ctx?: TransactionContext,
  ): Promise<{ id: string } | null>;
  abstract revoke(id: string, ctx?: TransactionContext): Promise<void>;
}
