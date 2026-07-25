import { GetItemByIdUseCase } from '../../src/modules/catalog/application/use-cases/get-item-by-id.use-case';
import { ListItemsUseCase } from '../../src/modules/catalog/application/use-cases/list-items.use-case';
import { ItemEntity } from '../../src/modules/catalog/domain/entities/item.entity';
import { ItemRepository } from '../../src/modules/catalog/domain/repositories/item.repository';
import { ItemNotFoundError } from '../../src/modules/catalog/domain/errors/item.errors';

function makeItem(overrides: Partial<ItemEntity> = {}): ItemEntity {
  return new ItemEntity(
    overrides.id ?? 'item-1',
    overrides.companyId ?? 'company-1',
    overrides.type ?? 'PRODUCT',
    overrides.sku ?? 'SKU-1',
    overrides.name ?? 'Resma de papel A4',
    overrides.description ?? null,
    overrides.categoryId ?? null,
    overrides.unitOfMeasure ?? 'unidad',
    overrides.tracksStock ?? true,
    overrides.minimumStock ?? null,
    overrides.isActive ?? true,
    overrides.taxIds ?? [],
  );
}

function makeItemRepository(): jest.Mocked<ItemRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findBySku: jest.fn(),
    findAllByCompany: jest.fn(),
    update: jest.fn(),
    setActive: jest.fn(),
  } as jest.Mocked<ItemRepository>;
}

describe('GetItemByIdUseCase', () => {
  it('devuelve el ítem cuando existe en la empresa', async () => {
    const itemRepository = makeItemRepository();
    itemRepository.findById.mockResolvedValue(makeItem());
    const useCase = new GetItemByIdUseCase(itemRepository);

    const result = await useCase.execute('item-1', 'company-1');

    expect(result.id).toBe('item-1');
  });

  it('lanza ItemNotFoundError si no existe', async () => {
    const itemRepository = makeItemRepository();
    itemRepository.findById.mockResolvedValue(null);
    const useCase = new GetItemByIdUseCase(itemRepository);

    await expect(useCase.execute('no-existe', 'company-1')).rejects.toThrow(ItemNotFoundError);
  });
});

describe('ListItemsUseCase', () => {
  it('pasa los filtros al repositorio', async () => {
    const itemRepository = makeItemRepository();
    itemRepository.findAllByCompany.mockResolvedValue([makeItem()]);
    const useCase = new ListItemsUseCase(itemRepository);

    const result = await useCase.execute({
      companyId: 'company-1',
      type: 'PRODUCT',
      isActive: true,
      search: 'papel',
    });

    expect(result).toHaveLength(1);
    expect(itemRepository.findAllByCompany).toHaveBeenCalledWith('company-1', {
      type: 'PRODUCT',
      categoryId: undefined,
      isActive: true,
      search: 'papel',
    });
  });
});
