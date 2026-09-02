import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { TokenProviderPort } from '../../src/modules/auth/domain/repositories/token-provider.port';
import { UserRepository } from '../../src/modules/auth/domain/repositories/user.repository';

function makeContext(authHeader?: string): ExecutionContext {
  const request: Record<string, unknown> = {
    headers: authHeader ? { authorization: authHeader } : {},
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let tokenProvider: jest.Mocked<TokenProviderPort>;
  let userRepository: jest.Mocked<UserRepository>;
  let reflector: jest.Mocked<Reflector>;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    tokenProvider = {
      signAccessToken: jest.fn(),
      verifyAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      hashRefreshToken: jest.fn(),
      decodeRefreshToken: jest.fn(),
    } as jest.Mocked<TokenProviderPort>;

    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      updateLastLogin: jest.fn(),
      create: jest.fn(),
      getTokensInvalidatedAt: jest.fn().mockResolvedValue(null),
      invalidateTokensNow: jest.fn(),
    } as jest.Mocked<UserRepository>;

    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) } as unknown as jest.Mocked<Reflector>;

    guard = new JwtAuthGuard(tokenProvider, userRepository, reflector);
  });

  it('permite el acceso con un token válido y sin invalidación pendiente', async () => {
    tokenProvider.verifyAccessToken.mockReturnValue({ sub: 'user-1', email: 'a@x.com', iatMs: 1_000_000 });
    userRepository.getTokensInvalidatedAt.mockResolvedValue(null);

    const context = makeContext('Bearer valid-token');
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rechaza sin header Authorization', async () => {
    await expect(guard.canActivate(makeContext())).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza un token que no pasa la verificación de firma/expiración', async () => {
    tokenProvider.verifyAccessToken.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    await expect(guard.canActivate(makeContext('Bearer garbage'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('hallazgo Bajo #7: rechaza un token emitido ANTES del logout aunque no haya expirado naturalmente', async () => {
    tokenProvider.verifyAccessToken.mockReturnValue({ sub: 'user-1', email: 'a@x.com', iatMs: 1_000_000 });
    userRepository.getTokensInvalidatedAt.mockResolvedValue(new Date(2_000_000));

    await expect(guard.canActivate(makeContext('Bearer old-token'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('permite un token emitido DESPUÉS del logout (re-login tras cerrar sesión)', async () => {
    tokenProvider.verifyAccessToken.mockReturnValue({ sub: 'user-1', email: 'a@x.com', iatMs: 3_000_000 });
    userRepository.getTokensInvalidatedAt.mockResolvedValue(new Date(2_000_000));

    await expect(guard.canActivate(makeContext('Bearer new-token'))).resolves.toBe(true);
  });

  it('distingue correctamente 1ms antes vs 1ms después del logout (precisión de milisegundo)', async () => {
    // Bug real encontrado en integración: usar el `iat` estándar del JWT
    // (solo segundo) contra un invalidatedAt en ms era ambiguo dentro del
    // mismo segundo — según cómo se redondeara, o rechazaba un re-login
    // legítimo o aceptaba un token viejo. iatMs (agregado por
    // JwtTokenProvider) resuelve la ambigüedad con precisión real de ms.
    userRepository.getTokensInvalidatedAt.mockResolvedValue(new Date(2_000_000));

    tokenProvider.verifyAccessToken.mockReturnValue({ sub: 'user-1', email: 'a@x.com', iatMs: 1_999_999 });
    await expect(guard.canActivate(makeContext('Bearer just-before'))).rejects.toThrow(
      UnauthorizedException,
    );

    tokenProvider.verifyAccessToken.mockReturnValue({ sub: 'user-1', email: 'a@x.com', iatMs: 2_000_001 });
    await expect(guard.canActivate(makeContext('Bearer just-after'))).resolves.toBe(true);
  });

  it('un token legado sin iatMs (firmado antes de este cambio) no se valida contra la invalidación', async () => {
    tokenProvider.verifyAccessToken.mockReturnValue({ sub: 'user-1', email: 'a@x.com', iat: 1000 });
    userRepository.getTokensInvalidatedAt.mockResolvedValue(new Date());

    await expect(guard.canActivate(makeContext('Bearer legacy-token'))).resolves.toBe(true);
    expect(userRepository.getTokensInvalidatedAt).not.toHaveBeenCalled();
  });

  it('rutas marcadas @Public() no requieren token ni consultan invalidación', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(guard.canActivate(makeContext())).resolves.toBe(true);
    expect(userRepository.getTokensInvalidatedAt).not.toHaveBeenCalled();
  });
});
