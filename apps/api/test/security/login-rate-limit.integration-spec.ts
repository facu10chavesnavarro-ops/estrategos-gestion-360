import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { GlobalExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/common/persistence/prisma.service';
import { resetDatabase } from '../support/reset-database';

/**
 * Prueba de integración real contra Postgres (estrategos_test) — auditoría
 * de seguridad, hallazgo A2 (sin rate limiting en POST /auth/login).
 *
 * Levanta una app Nest real (AuthModule completo, con el mismo
 * ValidationPipe/ExceptionFilter que main.ts) en un puerto efímero y
 * dispara requests HTTP reales con `fetch` — no mockea el guard ni el
 * servidor HTTP, para probar el comportamiento tal como lo vería un
 * atacante real.
 */
// beforeAll compila un módulo Nest completo (con argon2, que inicializa
// lento) y levanta un server HTTP real — supera el timeout por defecto de
// Jest (5s), igual que en multi-tenant-isolation.integration-spec.ts.
jest.setTimeout(30_000);

describe('Rate limiting en POST /auth/login (A2, DB real)', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      // ConfigModule global (como en AppModule real): JwtTokenProvider lo
      // necesita para JWT_SECRET/JWT_REFRESH_SECRET — al testear AuthModule
      // aislado (sin el resto de AppModule) hay que registrarlo a mano.
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule],
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
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    const prisma = app.get(PrismaService);
    await resetDatabase(prisma);
  });

  function attemptLogin() {
    return fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nadie@estrategos.test', password: 'lo-que-sea' }),
    });
  }

  it('permite los primeros 5 intentos (401 por credenciales inválidas) y bloquea el 6.º con 429', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await attemptLogin();
      statuses.push(res.status);
    }
    expect(statuses).toEqual([401, 401, 401, 401, 401]);

    const sixth = await attemptLogin();
    expect(sixth.status).toBe(429);
  });

  it('el bloqueo no revela si el usuario existe: mismo 429 sin importar el cuerpo enviado', async () => {
    for (let i = 0; i < 5; i++) {
      await attemptLogin();
    }

    const sixth = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'otro-distinto@estrategos.test', password: 'otra-cosa' }),
    });
    expect(sixth.status).toBe(429);
  });

  it('no afecta otros endpoints públicos de auth (refresh sigue respondiendo 401, no 429)', async () => {
    for (let i = 0; i < 5; i++) {
      await attemptLogin();
    }

    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'token-invalido' }),
    });
    expect(refreshRes.status).toBe(401);
  });
});
