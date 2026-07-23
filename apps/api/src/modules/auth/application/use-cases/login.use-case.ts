import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../domain/repositories/user.repository';
import { PasswordHasherPort } from '../../domain/repositories/password-hasher.port';
import { TokenProviderPort } from '../../domain/repositories/token-provider.port';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import {
  InvalidCredentialsError,
  UserInactiveError,
} from '../../domain/errors/auth.errors';
import { LoginInput, LoginOutput } from '../dto/login.dto';

/**
 * Un caso de uso = una responsabilidad de negocio completa (principio S de SOLID).
 * No sabe qué framework HTTP lo llama ni qué ORM persiste los datos:
 * solo conoce las interfaces (puertos) que declara el dominio.
 */
@Injectable()
export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenProvider: TokenProviderPort,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    if (!user.canAuthenticate()) {
      throw new UserInactiveError();
    }

    const passwordMatches = await this.passwordHasher.verify(
      user.passwordHash,
      input.password,
    );
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    const accessToken = this.tokenProvider.signAccessToken({
      sub: user.id,
      email: user.email,
    });

    const { token: refreshTokenPlain, expiresAt } =
      this.tokenProvider.generateRefreshToken(user.id);
    const refreshTokenHash =
      await this.tokenProvider.hashRefreshToken(refreshTokenPlain);

    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt,
    });

    await this.userRepository.updateLastLogin(user.id);

    return {
      accessToken,
      refreshToken: refreshTokenPlain,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    };
  }
}
