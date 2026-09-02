export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  /** Segundos desde epoch — jsonwebtoken lo agrega automáticamente al firmar. */
  iat?: number;
  /**
   * Milisegundos desde epoch — el `iat` estándar del JWT solo tiene
   * precisión de segundo (así lo define el spec), insuficiente para
   * comparar de forma no ambigua contra la marca de invalidación de
   * tokens en logout (hallazgo Bajo #7), que sí tiene precisión de ms.
   * Lo agrega internamente JwtTokenProvider.signAccessToken — no lo pasa
   * el caller.
   */
  iatMs?: number;
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
