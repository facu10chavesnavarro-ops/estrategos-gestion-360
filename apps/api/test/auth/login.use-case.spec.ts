import { LoginUseCase } from '../../src/modules/auth/application/use-cases/login.use-case';
import { UserEntity } from '../../src/modules/auth/domain/entities/user.entity';
import {
  InvalidCredentialsError,
  UserInactiveError,
} from '../../src/modules/auth/domain/errors/auth.errors';
import { UserRepository } from '../../src/modules/auth/domain/repositories/user.repository';
import { PasswordHasherPort } from '../../src/modules/auth/domain/repositories/password-hasher.port';
import { TokenProviderPort } from '../../src/modules/auth/domain/repositories/token-provider.port';
import { RefreshTokenRepository } from '../../src/modules/auth/domain/repositories/refresh-token.repository';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import {
  createFakeUnitOfWork,
  FAKE_TRANSACTION_CONTEXT,
} from '../support/fake-unit-of-work';

describe('LoginUseCase', () => {
  const activeUser = new UserEntity(
    'user-1',
    'admin@estrategos.com',
    'hashed-password',
    'Admin Estrategos',
    true,
    new Date('2026-01-01'), // ya inició sesión antes
  );
  const inactiveUser = new UserEntity(
    'user-2',
    'inactive@estrategos.com',
    'hashed-password',
    'Usuario Inactivo',
    false,
  );
  const firstTimeUser = new UserEntity(
    'user-3',
    'nuevo@estrategos.com',
    'hashed-password',
    'Usuario Nuevo',
    true,
    null, // nunca inició sesión — RN-USR-08
  );

  let userRepository: jest.Mocked<UserRepository>;
  let passwordHasher: jest.Mocked<PasswordHasherPort>;
  let tokenProvider: jest.Mocked<TokenProviderPort>;
  let refreshTokenRepository: jest.Mocked<RefreshTokenRepository>;
  let auditLogRepository: jest.Mocked<AuditLogRepository>;
  let useCase: LoginUseCase;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      updateLastLogin: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    passwordHasher = {
      hash: jest.fn(),
      verify: jest.fn(),
    } as jest.Mocked<PasswordHasherPort>;

    tokenProvider = {
      signAccessToken: jest.fn().mockReturnValue('access-token'),
      verifyAccessToken: jest.fn(),
      generateRefreshToken: jest
        .fn()
        .mockReturnValue({ token: 'refresh-token', expiresAt: new Date() }),
      hashRefreshToken: jest.fn().mockResolvedValue('hashed-refresh-token'),
      decodeRefreshToken: jest.fn(),
    } as jest.Mocked<TokenProviderPort>;

    refreshTokenRepository = {
      create: jest.fn(),
      findValidByUserAndHash: jest.fn(),
      revoke: jest.fn(),
    } as jest.Mocked<RefreshTokenRepository>;

    auditLogRepository = {
      record: jest.fn(),
    } as jest.Mocked<AuditLogRepository>;

    useCase = new LoginUseCase(
      userRepository,
      passwordHasher,
      tokenProvider,
      refreshTokenRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );
  });

  it('devuelve access y refresh token cuando las credenciales son válidas', async () => {
    userRepository.findByEmail.mockResolvedValue(activeUser);
    passwordHasher.verify.mockResolvedValue(true);

    const result = await useCase.execute({
      email: activeUser.email,
      password: 'plain-password',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.user.id).toBe(activeUser.id);
    expect(refreshTokenRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: activeUser.id }),
      FAKE_TRANSACTION_CONTEXT,
    );
    expect(userRepository.updateLastLogin).toHaveBeenCalledWith(
      activeUser.id,
      FAKE_TRANSACTION_CONTEXT,
    );
  });

  it('lanza InvalidCredentialsError si el usuario no existe', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.verify.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'no-existe@x.com', password: 'x' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('hallazgo Bajo #4 (timing side-channel): igual que con un usuario existente, llama a verify() aunque el email no exista — así el tiempo de respuesta no delata si la cuenta existe', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.verify.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'no-existe@x.com', password: 'x' }),
    ).rejects.toThrow(InvalidCredentialsError);

    expect(passwordHasher.verify).toHaveBeenCalledTimes(1);
    // El hash real de un usuario nunca llega acá — se usa un hash dummy fijo.
    expect(passwordHasher.verify).not.toHaveBeenCalledWith(undefined, 'x');
  });

  it('lanza InvalidCredentialsError si la contraseña no coincide', async () => {
    userRepository.findByEmail.mockResolvedValue(activeUser);
    passwordHasher.verify.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: activeUser.email, password: 'mala' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('usuario inactivo + contraseña incorrecta: InvalidCredentialsError genérico, no revela que la cuenta existe', async () => {
    userRepository.findByEmail.mockResolvedValue(inactiveUser);
    passwordHasher.verify.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: inactiveUser.email, password: 'mala' }),
    ).rejects.toThrow(InvalidCredentialsError);

    expect(passwordHasher.verify).toHaveBeenCalledWith(inactiveUser.passwordHash, 'mala');
  });

  it('lanza UserInactiveError si el usuario está inactivo pero la contraseña sí coincide', async () => {
    userRepository.findByEmail.mockResolvedValue(inactiveUser);
    passwordHasher.verify.mockResolvedValue(true);

    await expect(
      useCase.execute({ email: inactiveUser.email, password: 'correcta' }),
    ).rejects.toThrow(UserInactiveError);
  });

  it('RN-USR-08: audita user.first_access cuando lastLoginAt era null', async () => {
    userRepository.findByEmail.mockResolvedValue(firstTimeUser);
    passwordHasher.verify.mockResolvedValue(true);

    await useCase.execute({
      email: firstTimeUser.email,
      password: 'plain-password',
    });

    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'user.first_access',
        userId: firstTimeUser.id,
      }),
      FAKE_TRANSACTION_CONTEXT,
    );
  });

  it('RN-USR-08: NO audita user.first_access en un login subsiguiente', async () => {
    userRepository.findByEmail.mockResolvedValue(activeUser);
    passwordHasher.verify.mockResolvedValue(true);

    await useCase.execute({
      email: activeUser.email,
      password: 'plain-password',
    });

    expect(auditLogRepository.record).not.toHaveBeenCalled();
  });
});
