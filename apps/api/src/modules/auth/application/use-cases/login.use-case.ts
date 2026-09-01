import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../domain/repositories/user.repository';
import { PasswordHasherPort } from '../../domain/repositories/password-hasher.port';
import { TokenProviderPort } from '../../domain/repositories/token-provider.port';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { UnitOfWork } from '../../../../common/domain/transaction/unit-of-work.port';
import {
  InvalidCredentialsError,
  UserInactiveError,
} from '../../domain/errors/auth.errors';
import { LoginInput, LoginOutput } from '../dto/login.dto';

/**
 * Auditoría de seguridad (hallazgo Bajo #4): hash argon2id válido pero sin
 * contraseña real detrás — se usa para pagar el mismo costo de verify()
 * cuando el email no existe, así el tiempo de respuesta no distingue
 * "usuario inexistente" de "contraseña incorrecta" (enumeración de
 * usuarios por timing side-channel).
 */
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$4R8dTC3uNN9/oiKPRHa/OA$uznESUXzER+ZNjOGyE59S/i5xfWPEM5tqccLe6R/Md0';

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
    private readonly auditLogRepository: AuditLogRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const user = await this.userRepository.findByEmail(input.email);

    // Auditoría de seguridad (hallazgo Bajo #4): verify() se llama siempre,
    // exista o no el usuario, contra su hash real o contra DUMMY_PASSWORD_HASH.
    // Como efecto adicional (más allá del timing), un email inexistente y uno
    // inactivo con contraseña incorrecta ahora devuelven el mismo error
    // genérico — antes un usuario inactivo revelaba "esta cuenta existe y
    // está inactiva" sin siquiera validar la contraseña.
    const passwordMatches = await this.passwordHasher.verify(
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      input.password,
    );
    if (!user || !passwordMatches) {
      throw new InvalidCredentialsError();
    }

    if (!user.canAuthenticate()) {
      throw new UserInactiveError();
    }

    const accessToken = this.tokenProvider.signAccessToken({
      sub: user.id,
      email: user.email,
    });

    const { token: refreshTokenPlain, expiresAt } =
      this.tokenProvider.generateRefreshToken(user.id);
    const refreshTokenHash =
      await this.tokenProvider.hashRefreshToken(refreshTokenPlain);

    await this.unitOfWork.run(async (ctx) => {
      await this.refreshTokenRepository.create(
        {
          userId: user.id,
          tokenHash: refreshTokenHash,
          expiresAt,
        },
        ctx,
      );

      // RN-USR-08: "primer acceso auditado" del flujo de alta de usuario —
      // se detecta ANTES de actualizar lastLoginAt (que lo pisa a continuación).
      if (user.lastLoginAt === null) {
        await this.auditLogRepository.record(
          {
            userId: user.id,
            action: 'user.first_access',
            entityType: 'User',
            entityId: user.id,
          },
          ctx,
        );
      }

      await this.userRepository.updateLastLogin(user.id, ctx);
    });

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
