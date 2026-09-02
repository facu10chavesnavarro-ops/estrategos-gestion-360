import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { GlobalExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/common/persistence/prisma.service';
import { Argon2PasswordHasher } from '../../src/modules/auth/infrastructure/argon2-password-hasher';
import { resetDatabase } from '../support/reset-database';

/**
 * Prueba de integración real contra Postgres (estrategos_test) — auditoría
 * de seguridad, hallazgo Bajo #7 (logout no revocaba el access token en
 * curso). Levanta una app Nest real con el JwtAuthGuard global activo (no
 * solo AuthModule, como en login-rate-limit — acá hace falta el guard para
 * probar un endpoint protegido real, GET /auth/me) y dispara requests HTTP
 * reales.
 */
jest.setTimeout(30_000);

describe('Logout invalida access tokens en circulación (Bajo #7, DB real)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule],
      providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? address : address.port;
    baseUrl = `http://127.0.0.1:${port}`;
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);

    const hasher = new Argon2PasswordHasher();
    await prisma.user.create({
      data: {
        email: 'logout-test@estrategos.test',
        passwordHash: await hasher.hash('CambiarEsta123!'),
        fullName: 'Usuario de prueba',
        isActive: true,
      },
    });
  });

  async function login() {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'logout-test@estrategos.test',
        password: 'CambiarEsta123!',
      }),
    });
    expect(res.status).toBe(200);
    return (await res.json()) as { accessToken: string; refreshToken: string };
  }

  function callMe(accessToken: string) {
    return fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  it('el access token funciona antes del logout, y deja de funcionar inmediatamente después', async () => {
    const { accessToken, refreshToken } = await login();

    const before = await callMe(accessToken);
    expect(before.status).toBe(200);

    const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    expect(logoutRes.status).toBe(200);

    // Mismo access token, sin esperar a que expire naturalmente (15 min) —
    // antes de este fix seguía siendo válido hasta esa expiración.
    const after = await callMe(accessToken);
    expect(after.status).toBe(401);
  });

  it('un login posterior al logout emite un access token válido de nuevo', async () => {
    const first = await login();
    await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: first.refreshToken }),
    });

    const second = await login();
    const res = await callMe(second.accessToken);
    expect(res.status).toBe(200);
  });

  it('logout no afecta el acceso de otro usuario', async () => {
    const hasher = new Argon2PasswordHasher();
    await prisma.user.create({
      data: {
        email: 'otro-usuario@estrategos.test',
        passwordHash: await hasher.hash('CambiarEsta123!'),
        fullName: 'Otro usuario',
        isActive: true,
      },
    });

    const { accessToken: otherAccessToken } = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'otro-usuario@estrategos.test', password: 'CambiarEsta123!' }),
    }).then((r) => r.json());

    const { refreshToken } = await login();
    await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const res = await callMe(otherAccessToken);
    expect(res.status).toBe(200);
  });
});
