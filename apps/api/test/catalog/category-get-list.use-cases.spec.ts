import { GetCategoryByIdUseCase } from '../../src/modules/catalog/application/use-cases/get-category-by-id.use-case';
import { ListCategoriesUseCase } from '../../src/modules/catalog/application/use-cases/list-categories.use-case';
import { CategoryEntity } from '../../src/modules/catalog/domain/entities/category.entity';
import { CategoryRepository } from '../../src/modules/catalog/domain/repositories/category.repository';
import { CategoryNotFoundError } from '../../src/modules/catalog/domain/errors/category.errors';

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

describe('GetCategoryByIdUseCase', () => {
  it('devuelve la categoría cuando existe en la empresa', async () => {
    const categoryRepository = makeCategoryRepository();
    categoryRepository.findById.mockResolvedValue(makeCategory());
    const useCase = new GetCategoryByIdUseCase(categoryRepository);

    const result = await useCase.execute('category-1', 'company-1');

    expect(result.id).toBe('category-1');
  });

  it('lanza CategoryNotFoundError si no existe', async () => {
    const categoryRepository = makeCategoryRepository();
    categoryRepository.findById.mockResolvedValue(null);
    const useCase = new GetCategoryByIdUseCase(categoryRepository);

    await expect(useCase.execute('no-existe', 'company-1')).rejects.toThrow(
      CategoryNotFoundError,
    );
  });
});

describe('ListCategoriesUseCase', () => {
  it('pasa el filtro isActive al repositorio', async () => {
    const categoryRepository = makeCategoryRepository();
    categoryRepository.findAllByCompany.mockResolvedValue([makeCategory()]);
    const useCase = new ListCategoriesUseCase(categoryRepository);

    const result = await useCase.execute({ companyId: 'company-1', isActive: true });

    expect(result).toHaveLength(1);
    expect(categoryRepository.findAllByCompany).toHaveBeenCalledWith('company-1', {
      isActive: true,
    });
  });
});
