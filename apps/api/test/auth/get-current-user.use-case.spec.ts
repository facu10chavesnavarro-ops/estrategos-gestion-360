import { GetCurrentUserUseCase } from '../../src/modules/auth/application/use-cases/get-current-user.use-case';
import { UserEntity } from '../../src/modules/auth/domain/entities/user.entity';
import { InvalidAccessTokenError } from '../../src/modules/auth/domain/errors/auth.errors';
import { UserRepository } from '../../src/modules/auth/domain/repositories/user.repository';
import { CompanyUserRepository } from '../../src/modules/companies/domain/repositories/company-user.repository';

describe('GetCurrentUserUseCase', () => {
  const activeUser = new UserEntity(
    'user-1',
    'admin@estrategos.com',
    'hashed-password',
    'Admin Estrategos',
    true,
  );
  const inactiveUser = new UserEntity(
    'user-2',
    'inactivo@estrategos.com',
    'hashed-password',
    'Usuario Inactivo',
    false,
  );

  let userRepository: jest.Mocked<UserRepository>;
  let companyUserRepository: jest.Mocked<CompanyUserRepository>;
  let useCase: GetCurrentUserUseCase;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      updateLastLogin: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    companyUserRepository = {
      hasRoleInTenant: jest.fn(),
      addMembership: jest.fn(),
      hasActiveMembershipByEmail: jest.fn(),
      findAllByCompanyWithDetails: jest.fn(),
      findMembership: jest.fn(),
      findMembershipWithRoleName: jest.fn(),
      updateRole: jest.fn(),
      setActive: jest.fn(),
    } as unknown as jest.Mocked<CompanyUserRepository>;

    useCase = new GetCurrentUserUseCase(userRepository, companyUserRepository);
  });

  it('devuelve la identidad sin membresía si no se pasa companyId', async () => {
    userRepository.findById.mockResolvedValue(activeUser);

    const result = await useCase.execute({ userId: activeUser.id });

    expect(result).toEqual({
      id: activeUser.id,
      email: activeUser.email,
      fullName: activeUser.fullName,
      membership: null,
    });
    expect(companyUserRepository.findMembershipWithRoleName).not.toHaveBeenCalled();
  });

  it('incluye rol y estado de membresía cuando se pasa companyId y existe', async () => {
    userRepository.findById.mockResolvedValue(activeUser);
    companyUserRepository.findMembershipWithRoleName.mockResolvedValue({
      roleId: 'role-1',
      roleName: 'Administrador de empresa',
      isActive: true,
    });

    const result = await useCase.execute({ userId: activeUser.id, companyId: 'company-1' });

    expect(result.membership).toEqual({
      companyId: 'company-1',
      roleId: 'role-1',
      roleName: 'Administrador de empresa',
      isActive: true,
    });
  });

  it('membership queda null si el usuario no es miembro de esa empresa', async () => {
    userRepository.findById.mockResolvedValue(activeUser);
    companyUserRepository.findMembershipWithRoleName.mockResolvedValue(null);

    const result = await useCase.execute({ userId: activeUser.id, companyId: 'company-ajena' });

    expect(result.membership).toBeNull();
  });

  it('lanza InvalidAccessTokenError si el usuario no existe', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute({ userId: 'user-fantasma' })).rejects.toThrow(
      InvalidAccessTokenError,
    );
  });

  it('lanza InvalidAccessTokenError si el usuario está inactivo', async () => {
    userRepository.findById.mockResolvedValue(inactiveUser);

    await expect(useCase.execute({ userId: inactiveUser.id })).rejects.toThrow(
      InvalidAccessTokenError,
    );
  });
});
