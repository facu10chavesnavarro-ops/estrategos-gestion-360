import { LogoutUseCase } from '../../src/modules/auth/application/use-cases/logout.use-case';
import { TokenProviderPort } from '../../src/modules/auth/domain/repositories/token-provider.port';
import { RefreshTokenRepository } from '../../src/modules/auth/domain/repositories/refresh-token.repository';
import { UserRepository } from '../../src/modules/auth/domain/repositories/user.repository';
import { InvalidRefreshTokenError } from '../../src/modules/auth/domain/errors/auth.errors';

describe('LogoutUseCase', () => {
  let tokenProvider: jest.Mocked<TokenProviderPort>;
  let refreshTokenRepository: jest.Mocked<RefreshTokenRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let useCase: LogoutUseCase;

  beforeEach(() => {
    tokenProvider = {
      signAccessToken: jest.fn(),
      verifyAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      hashRefreshToken: jest.fn().mockResolvedValue('hashed-token'),
      decodeRefreshToken: jest.fn().mockReturnValue({ sub: 'user-1' }),
    } as jest.Mocked<TokenProviderPort>;

    refreshTokenRepository = {
      create: jest.fn(),
      findValidByUserAndHash: jest.fn(),
      revoke: jest.fn(),
    } as jest.Mocked<RefreshTokenRepository>;

    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      updateLastLogin: jest.fn(),
      create: jest.fn(),
      getTokensInvalidatedAt: jest.fn(),
      invalidateTokensNow: jest.fn(),
    } as jest.Mocked<UserRepository>;

    useCase = new LogoutUseCase(tokenProvider, refreshTokenRepository, userRepository);
  });

  it('revoca el refresh token cuando es válido', async () => {
    refreshTokenRepository.findValidByUserAndHash.mockResolvedValue({ id: 'rt-1' });

    await useCase.execute({ refreshToken: 'plain-token' });

    expect(refreshTokenRepository.revoke).toHaveBeenCalledWith('rt-1');
  });

  it('hallazgo Bajo #7: invalida todos los access tokens en circulación del usuario', async () => {
    refreshTokenRepository.findValidByUserAndHash.mockResolvedValue({ id: 'rt-1' });

    await useCase.execute({ refreshToken: 'plain-token' });

    expect(userRepository.invalidateTokensNow).toHaveBeenCalledWith('user-1');
  });

  it('no lanza error si el token ya no es válido (logout es idempotente)', async () => {
    refreshTokenRepository.findValidByUserAndHash.mockResolvedValue(null);

    await expect(useCase.execute({ refreshToken: 'plain-token' })).resolves.toBeUndefined();
    expect(refreshTokenRepository.revoke).not.toHaveBeenCalled();
    // Sigue invalidando los access tokens aunque el refresh token específico
    // ya no fuera válido — logout debe cerrar la sesión igual.
    expect(userRepository.invalidateTokensNow).toHaveBeenCalledWith('user-1');
  });

  it('no lanza error si el token está mal formado / no se puede decodificar', async () => {
    tokenProvider.decodeRefreshToken.mockImplementation(() => {
      throw new InvalidRefreshTokenError();
    });

    await expect(useCase.execute({ refreshToken: 'basura' })).resolves.toBeUndefined();
    expect(refreshTokenRepository.findValidByUserAndHash).not.toHaveBeenCalled();
    expect(userRepository.invalidateTokensNow).not.toHaveBeenCalled();
  });
});
