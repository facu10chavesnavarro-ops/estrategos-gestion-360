import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../domain/repositories/user.repository';
import { TokenProviderPort } from '../../domain/repositories/token-provider.port';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
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
    private readonly unitOfWork: UnitOfWork,
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

    const accessToken = this.tokenProvider.signAccessToken({
      sub: user.id,
      email: user.email,
    });
    const { token: newRefreshTokenPlain, expiresAt } =
      this.tokenProvider.generateRefreshToken(user.id);
    const newHash = await this.tokenProvider.hashRefreshToken(
      newRefreshTokenPlain,
    );

    // Rotación: revocar el token usado y emitir uno nuevo son atómicos —
    // si el segundo paso fallara sin el primero revertido, la sesión
    // quedaría sin ningún refresh token válido.
    await this.unitOfWork.run(async (ctx) => {
      await this.refreshTokenRepository.revoke(existing.id, ctx);
      await this.refreshTokenRepository.create(
        {
          userId: user.id,
          tokenHash: newHash,
          expiresAt,
        },
        ctx,
      );
    });

    return { accessToken, refreshToken: newRefreshTokenPlain };
  }
}
