export interface CreateRefreshTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export abstract class RefreshTokenRepository {
  abstract create(input: CreateRefreshTokenInput): Promise<void>;
  abstract findValidByUserAndHash(
    userId: string,
    tokenHash: string,
  ): Promise<{ id: string } | null>;
  abstract revoke(id: string): Promise<void>;
}
