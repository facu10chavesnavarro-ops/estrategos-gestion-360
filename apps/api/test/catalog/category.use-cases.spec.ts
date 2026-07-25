import { CreateCategoryUseCase } from '../../src/modules/catalog/application/use-cases/create-category.use-case';
import { UpdateCategoryUseCase } from '../../src/modules/catalog/application/use-cases/update-category.use-case';
import { DeactivateCategoryUseCase } from '../../src/modules/catalog/application/use-cases/deactivate-category.use-case';
import { ActivateCategoryUseCase } from '../../src/modules/catalog/application/use-cases/activate-category.use-case';
import { CategoryEntity } from '../../src/modules/catalog/domain/entities/category.entity';
import { CategoryRepository } from '../../src/modules/catalog/domain/repositories/category.repository';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import {
  CategoryNotFoundError,
  InvalidParentCategoryError,
  CategoryCycleError,
  CategoryAlreadyInTargetStateError,
} from '../../src/modules/catalog/domain/errors/category.errors';
import {
  createFakeUnitOfWork,
  FAKE_TRANSACTION_CONTEXT,
} from '../support/fake-unit-of-work';

function makeCategory(overrides: Partial<CategoryEntity> = {}): CategoryEntity {
  return new CategoryEntity(
    overrides.id ?? 'category-1',
    overrides.companyId ?? 'company-1',
    overrides.parentId ?? null,
    overrides.name ?? 'Insumos de oficina',
    overrides.isActive ?? true,
  );
}

function makeCategoryRepository(): jest.Mocked<CategoryRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByCompany: jest.fn(),
    update: jest.fn(),
    setActive: jest.fn(),
  } as jest.Mocked<CategoryRepository>;
}

describe('CreateCategoryUseCase', () => {
  it('crea la categoría cuando el rol autoriza', async () => {
    const categoryRepository = makeCategoryRepository();
    categoryRepository.create.mockResolvedValue(makeCategory());
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateCategoryUseCase(
      categoryRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      name: 'Insumos de oficina',
    });

    expect(result.name).toBe('Insumos de oficina');
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'category.create' }),
      FAKE_TRANSACTION_CONTEXT,
    );
  });

  it('rechaza si el rol no autoriza', async () => {
    const categoryRepository = makeCategoryRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateCategoryUseCase(
      categoryRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Empleado',
        companyId: 'company-1',
        name: 'Insumos de oficina',
      }),
    ).rejects.toThrow(RoleNotAuthorizedError);
  });

  it('RN-CAT-02: rechaza si el parentId no existe en esta empresa', async () => {
    const categoryRepository = makeCategoryRepository();
    categoryRepository.findById.mockResolvedValue(null);
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateCategoryUseCase(
      categoryRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        parentId: 'no-existe',
        name: 'Papelería',
      }),
    ).rejects.toThrow(InvalidParentCategoryError);
  });
});

describe('UpdateCategoryUseCase', () => {
  it('actualiza el nombre cuando el rol autoriza', async () => {
    const categoryRepository = makeCategoryRepository();
    categoryRepository.findById.mockResolvedValue(makeCategory());
    categoryRepository.update.mockResolvedValue(makeCategory({ name: 'Papelería' }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateCategoryUseCase(
      categoryRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      categoryId: 'category-1',
      name: 'Papelería',
    });

    expect(result.name).toBe('Papelería');
  });

  it('rechaza si la categoría no existe', async () => {
    const categoryRepository = makeCategoryRepository();
    categoryRepository.findById.mockResolvedValue(null);
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateCategoryUseCase(
      categoryRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        categoryId: 'no-existe',
        name: 'X',
      }),
    ).rejects.toThrow(CategoryNotFoundError);
  });

  it('RN-CAT-03: rechaza asignar como padre a sí misma', async () => {
    const categoryRepository = makeCategoryRepository();
    categoryRepository.findById.mockResolvedValue(makeCategory({ id: 'category-1' }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateCategoryUseCase(
      categoryRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        categoryId: 'category-1',
        parentId: 'category-1',
      }),
    ).rejects.toThrow(CategoryCycleError);
  });

  it('RN-CAT-03: rechaza un ciclo indirecto (el nuevo padre desciende de esta categoría)', async () => {
    const categoryRepository = makeCategoryRepository();
    // category-1 (target) -> category-2 (hijo) -> category-3 (nieto).
    // Intentar poner a category-1 como hija de category-3 crearía un ciclo.
    categoryRepository.findById.mockImplementation(async (id) => {
      if (id === 'category-1') return makeCategory({ id: 'category-1', parentId: null });
      if (id === 'category-3') return makeCategory({ id: 'category-3', parentId: 'category-2' });
      if (id === 'category-2') return makeCategory({ id: 'category-2', parentId: 'category-1' });
      return null;
    });
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateCategoryUseCase(
      categoryRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        categoryId: 'category-1',
        parentId: 'category-3',
      }),
    ).rejects.toThrow(CategoryCycleError);
  });
});

describe('DeactivateCategoryUseCase / ActivateCategoryUseCase', () => {
  it('desactiva una categoría activa', async () => {
    const categoryRepository = makeCategoryRepository();
    categoryRepository.findById.mockResolvedValue(makeCategory({ isActive: true }));
    categoryRepository.setActive.mockResolvedValue(makeCategory({ isActive: false }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new DeactivateCategoryUseCase(
      categoryRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      categoryId: 'category-1',
    });

    expect(result.isActive).toBe(false);
  });

  it('rechaza desactivar una categoría ya inactiva (RN-CAT-16)', async () => {
    const categoryRepository = makeCategoryRepository();
    categoryRepository.findById.mockResolvedValue(makeCategory({ isActive: false }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new DeactivateCategoryUseCase(
      categoryRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        categoryId: 'category-1',
      }),
    ).rejects.toThrow(CategoryAlreadyInTargetStateError);
  });

  it('reactiva una categoría inactiva', async () => {
    const categoryRepository = makeCategoryRepository();
    categoryRepository.findById.mockResolvedValue(makeCategory({ isActive: false }));
    categoryRepository.setActive.mockResolvedValue(makeCategory({ isActive: true }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new ActivateCategoryUseCase(
      categoryRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      categoryId: 'category-1',
    });

    expect(result.isActive).toBe(true);
  });
});
