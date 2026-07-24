import { Module } from '@nestjs/common';
import { AuthController } from './presentation/controllers/auth.controller';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RefreshSessionUseCase } from './application/use-cases/refresh-session.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
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
  controllers: [AuthController],
  providers: [
    PrismaService,
    LoginUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: RefreshTokenRepository, useClass: PrismaRefreshTokenRepository },
    { provide: PasswordHasherPort, useClass: Argon2PasswordHasher },
    { provide: TokenProviderPort, useClass: JwtTokenProvider },
    { provide: AuditLogRepository, useClass: PrismaAuditLogRepository },
    { provide: UnitOfWork, useClass: PrismaUnitOfWork },
  ],
  // TokenProviderPort se exporta: el JwtAuthGuard global (en AppModule) lo necesita.
  exports: [TokenProviderPort],
})
export class AuthModule {}
