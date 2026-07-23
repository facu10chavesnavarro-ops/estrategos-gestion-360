import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  InvitationTokenPort,
  GeneratedInvitationToken,
} from '../domain/repositories/invitation-token.port';

@Injectable()
export class CryptoInvitationTokenProvider extends InvitationTokenPort {
  generate(): GeneratedInvitationToken {
    const token = crypto.randomBytes(32).toString('hex');
    return { token, tokenHash: this.hash(token) };
  }

  hash(token: string): string {
    // SHA-256, no argon2: un token aleatorio de 32 bytes ya tiene entropía
    // suficiente — no necesita un hash lento pensado para contraseñas de baja
    // entropía (mismo criterio que RefreshToken, ver jwt-token-provider.ts).
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
