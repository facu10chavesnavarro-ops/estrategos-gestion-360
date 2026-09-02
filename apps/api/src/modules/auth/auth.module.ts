import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './presentation/controllers/auth.controller';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RefreshSessionUseCase } from './application/use-cases/refresh-session.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';
import { CompaniesModule } from '../companies/companies.module';
import { UserRepository } from './domain/repositories/user.repository';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { RefreshTokenRepository } from './domain/repositories/refresh-token.repository';
import { PrismaRefreshTokenRepository } from './infrastructure/persistence/prisma-refresh-token.repository';
import { PasswordHasherPort } from './domain/repositories/password-hasher.port';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher';
import { TokenProviderPort } from './domain/repositories/token-provider.port';
import { JwtTokenProvider } from './infrastructure/jwt-token-provider';
import { PrismaService } from '../../common/persistence/prisma.service';
import { AuditLogRepository } from '../../common/domain/repositories/audit-log.repository';
import { PrismaAuditLogRepository } from '../../common/infrastructure/persistence/prisma-audit-log.repository';
import { UnitOfWork } from '../../common/domain/transaction/unit-of-work.port';
import { PrismaUnitOfWork } from '../../common/infrastructure/persistence/prisma-unit-of-work';

@Module({
  imports: [
    CompaniesModule,
    // Auditoría de seguridad (hallazgo A2): sin esto, POST /auth/login no
    // tenía ninguna protección contra fuerza bruta / credential stuffing.
    // Registrado acá (no en AppModule) para acotar el alcance al módulo de
    // auth — no se toca el comportamiento de ningún otro endpoint.
    ThrottlerModule.forRoot([
      {
        name: 'login',
        ttl: 15 * 60 * 1000, // 15 minutos
        limit: 5, // 5 intentos por IP en la ventana
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    PrismaService,
    LoginUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
    GetCurrentUserUseCase,
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: RefreshTokenRepository, useClass: PrismaRefreshTokenRepository },
    { provide: PasswordHasherPort, useClass: Argon2PasswordHasher },
    { provide: TokenProviderPort, useClass: JwtTokenProvider },
    { provide: AuditLogRepository, useClass: PrismaAuditLogRepository },
    { provide: UnitOfWork, useClass: PrismaUnitOfWork },
  ],
  // TokenProviderPort y UserRepository se exportan: el JwtAuthGuard global
  // (en AppModule) los necesita — este último desde el hallazgo Bajo #7
  // (invalidación de access tokens en logout).
  exports: [TokenProviderPort, UserRepository],
})
export class AuthModule {}
