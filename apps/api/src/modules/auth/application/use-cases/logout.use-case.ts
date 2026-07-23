import { Injectable } from '@nestjs/common';
import { TokenProviderPort } from '../../domain/repositories/token-provider.port';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';

export interface LogoutInput {
  refreshToken: string;
}

/**
 * M01 del documento fuente ("cierre de sesión") — hasta ahora solo existía
 * login/refresh. Revoca el refresh token para que no pueda usarse de nuevo,
 * aunque haya sido filtrado. No lanza error si el token ya era inválido o
 * no existía: cerrar sesión con un token viejo/inexistente no debe fallar
 * desde la perspectiva del usuario (el resultado que le importa —"ya no
 * estoy logueado"— ya se cumple).
 */
@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly tokenProvider: TokenProviderPort,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    let userId: string;
    try {
      ({ sub: userId } = this.tokenProvider.decodeRefreshToken(input.refreshToken));
    } catch {
      return;
    }

    const tokenHash = await this.tokenProvider.hashRefreshToken(input.refreshToken);
    const existing = await this.refreshTokenRepository.findValidByUserAndHash(
      userId,
      tokenHash,
    );
    if (existing) {
      await this.refreshTokenRepository.revoke(existing.id);
    }
  }
}
