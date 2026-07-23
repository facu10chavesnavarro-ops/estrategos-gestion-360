export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
}

export abstract class TokenProviderPort {
  abstract signAccessToken(payload: AccessTokenPayload): string;
  abstract verifyAccessToken(token: string): AccessTokenPayload;

  /** Devuelve el token en texto plano (se hashea antes de persistir) y su expiración. */
  abstract generateRefreshToken(userId: string): { token: string; expiresAt: Date };
  abstract hashRefreshToken(token: string): Promise<string>;
  /** Extrae el userId del refresh token SIN requerir un access token vigente. */
  abstract decodeRefreshToken(token: string): { sub: string };
}
