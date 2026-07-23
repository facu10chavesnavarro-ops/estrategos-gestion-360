import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../domain/repositories/user.repository';
import { TokenProviderPort } from '../../domain/repositories/token-provider.port';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { InvalidRefreshTokenError } from '../../domain/errors/auth.errors';

export interface RefreshSessionInput {
  refreshToken: string;
}

export interface RefreshSessionOutput {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class RefreshSessionUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenProvider: TokenProviderPort,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async execute(input: RefreshSessionInput): Promise<RefreshSessionOutput> {
    const { sub: userId } = this.tokenProvider.decodeRefreshToken(
      input.refreshToken,
    );

    const user = await this.userRepository.findById(userId);
    if (!user || !user.canAuthenticate()) {
      throw new InvalidRefreshTokenError();
    }

    const incomingHash = await this.tokenProvider.hashRefreshToken(
      input.refreshToken,
    );
    const existing = await this.refreshTokenRepository.findValidByUserAndHash(
      user.id,
      incomingHash,
    );
    if (!existing) {
      throw new InvalidRefreshTokenError();
    }

    // Rotación: se revoca el token usado y se emite uno nuevo.
    await this.refreshTokenRepository.revoke(existing.id);

    const accessToken = this.tokenProvider.signAccessToken({
      sub: user.id,
      email: user.email,
    });
    const { token: newRefreshTokenPlain, expiresAt } =
      this.tokenProvider.generateRefreshToken(user.id);
    const newHash = await this.tokenProvider.hashRefreshToken(
      newRefreshTokenPlain,
    );

    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: newHash,
      expiresAt,
    });

    return { accessToken, refreshToken: newRefreshTokenPlain };
  }
}
