import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import {
  TokenProviderPort,
  AccessTokenPayload,
} from '../domain/repositories/token-provider.port';
import {
  InvalidRefreshTokenError,
  InvalidAccessTokenError,
} from '../domain/errors/auth.errors';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 30;

@Injectable()
export class JwtTokenProvider extends TokenProviderPort {
  constructor(private readonly config: ConfigService) {
    super();
  }

  signAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, this.getSecret(), {
      expiresIn: ACCESS_TOKEN_TTL,
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      return jwt.verify(token, this.getSecret()) as AccessTokenPayload;
    } catch {
      throw new InvalidAccessTokenError();
    }
  }

  generateRefreshToken(userId: string): { token: string; expiresAt: Date } {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);
    const token = jwt.sign({ sub: userId }, this.getRefreshSecret(), {
      expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d`,
    });
    return { token, expiresAt };
  }

  async hashRefreshToken(token: string): Promise<string> {
    // El hash se guarda en DB para poder revocar/rotar sin exponer el token en texto plano.
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  decodeRefreshToken(token: string): { sub: string } {
    try {
      const payload = jwt.verify(token, this.getRefreshSecret()) as {
        sub: string;
      };
      return { sub: payload.sub };
    } catch {
      throw new InvalidRefreshTokenError();
    }
  }

  private getSecret(): string {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET no está configurado');
    }
    return secret;
  }

  private getRefreshSecret(): string {
    // Secreto distinto al del access token: comprometer uno no compromete el otro.
    const secret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET no está configurado');
    }
    return secret;
  }
}
