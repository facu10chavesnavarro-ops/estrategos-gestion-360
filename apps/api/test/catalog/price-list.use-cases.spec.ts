import { CreatePriceListUseCase } from '../../src/modules/catalog/application/use-cases/create-price-list.use-case';
import { UpdatePriceListUseCase } from '../../src/modules/catalog/application/use-cases/update-price-list.use-case';
import { DeactivatePriceListUseCase } from '../../src/modules/catalog/application/use-cases/deactivate-price-list.use-case';
import { ActivatePriceListUseCase } from '../../src/modules/catalog/application/use-cases/activate-price-list.use-case';
import { ListPriceListsUseCase } from '../../src/modules/catalog/application/use-cases/list-price-lists.use-case';
import { ListPriceListItemsUseCase } from '../../src/modules/catalog/application/use-cases/list-price-list-items.use-case';
import { SetPriceListItemUseCase } from '../../src/modules/catalog/application/use-cases/set-price-list-item.use-case';
import { RemovePriceListItemUseCase } from '../../src/modules/catalog/application/use-cases/remove-price-list-item.use-case';
import {
  PriceListEntity,
  PriceListItemEntity,
} from '../../src/modules/catalog/domain/entities/price-list.entity';
import { PriceListRepository } from '../../src/modules/catalog/domain/repositories/price-list.repository';
import { ItemRepository } from '../../src/modules/catalog/domain/repositories/item.repository';
import { ItemEntity } from '../../src/modules/catalog/domain/entities/item.entity';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import {
  PriceListNotFoundError,
  PriceListAlreadyInTargetStateError,
  InvalidPriceError,
  ItemNotInPriceListError,
} from '../../src/modules/catalog/domain/errors/price-list.errors';
import { ItemNotFoundError } from '../../src/modules/catalog/domain/errors/item.errors';
import { createFakeUnitOfWork, FAKE_TRANSACTION_CONTEXT } from '../support/fake-unit-of-work';

function makePriceList(overrides: Partial<PriceListEntity> = {}): PriceListEntity {
  return new PriceListEntity(
    overrides.id ?? 'price-list-1',
    overrides.companyId ?? 'company-1',
    overrides.name ?? 'Minorista',
    overrides.currency ?? 'ARS',
    overrides.isDefault ?? false,
    overrides.validFrom ?? new Date('2026-01-01'),
    overrides.validTo ?? null,
    overrides.isActive ?? true,
  );
}

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

function makePriceListRepository(): jest.Mocked<PriceListRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByCompany: jest.fn(),
    update: jest.fn(),
    setActive: jest.fn(),
    clearDefaultForCompany: jest.fn(),
    findItem: jest.fn(),
    listItems: jest.fn(),
    upsertItem: jest.fn(),
    removeItem: jest.fn(),
  } as jest.Mocked<PriceListRepository>;
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

describe('CreatePriceListUseCase', () => {
  it('crea la lista cuando el rol autoriza', async () => {
    const priceListRepository = makePriceListRepository();
    priceListRepository.create.mockResolvedValue(makePriceList());
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreatePriceListUseCase(
      priceListRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      name: 'Minorista',
      currency: 'ARS',
    });

    expect(result.name).toBe('Minorista');
    expect(priceListRepository.clearDefaultForCompany).not.toHaveBeenCalled();
  });

  it('rechaza si el rol no autoriza', async () => {
    const priceListRepository = makePriceListRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreatePriceListUseCase(
      priceListRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Empleado',
        companyId: 'company-1',
        name: 'Minorista',
        currency: 'ARS',
      }),
    ).rejects.toThrow(RoleNotAuthorizedError);
  });

  it('RN-CAT-13: desmarca cualquier otra lista default antes de crear una nueva default', async () => {
    const priceListRepository = makePriceListRepository();
    priceListRepository.create.mockResolvedValue(makePriceList({ isDefault: true }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreatePriceListUseCase(
      priceListRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      name: 'Mayorista',
      currency: 'ARS',
      isDefault: true,
    });

    expect(priceListRepository.clearDefaultForCompany).toHaveBeenCalledWith(
      'company-1',
      undefined,
      FAKE_TRANSACTION_CONTEXT,
    );
  });
});

describe('UpdatePriceListUseCase', () => {
  it('actualiza el nombre', async () => {
    const priceListRepository = makePriceListRepository();
    priceListRepository.findById.mockResolvedValue(makePriceList());
    priceListRepository.update.mockResolvedValue(makePriceList({ name: 'Actualizada' }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdatePriceListUseCase(
      priceListRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      priceListId: 'price-list-1',
      name: 'Actualizada',
    });

    expect(result.name).toBe('Actualizada');
  });

  it('rechaza si la lista no existe', async () => {
    const priceListRepository = makePriceListRepository();
    priceListRepository.findById.mockResolvedValue(null);
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdatePriceListUseCase(
      priceListRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        priceListId: 'no-existe',
        name: 'X',
      }),
    ).rejects.toThrow(PriceListNotFoundError);
  });

  it('RN-CAT-13: al marcar isDefault, desmarca las demás excepto ella misma', async () => {
    const priceListRepository = makePriceListRepository();
    priceListRepository.findById.mockResolvedValue(makePriceList());
    priceListRepository.update.mockResolvedValue(makePriceList({ isDefault: true }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdatePriceListUseCase(
      priceListRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      priceListId: 'price-list-1',
      isDefault: true,
    });

    expect(priceListRepository.clearDefaultForCompany).toHaveBeenCalledWith(
      'company-1',
      'price-list-1',
      FAKE_TRANSACTION_CONTEXT,
    );
  });
});

describe('DeactivatePriceListUseCase / ActivatePriceListUseCase', () => {
  it('desactiva una lista activa', async () => {
    const priceListRepository = makePriceListRepository();
    priceListRepository.findById.mockResolvedValue(makePriceList({ isActive: true }));
    priceListRepository.setActive.mockResolvedValue(makePriceList({ isActive: false }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new DeactivatePriceListUseCase(
      priceListRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      priceListId: 'price-list-1',
    });

    expect(result.isActive).toBe(false);
  });

  it('rechaza desactivar una lista ya inactiva', async () => {
    const priceListRepository = makePriceListRepository();
    priceListRepository.findById.mockResolvedValue(makePriceList({ isActive: false }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new DeactivatePriceListUseCase(
      priceListRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        priceListId: 'price-list-1',
      }),
    ).rejects.toThrow(PriceListAlreadyInTargetStateError);
  });

  it('reactiva una lista inactiva', async () => {
    const priceListRepository = makePriceListRepository();
    priceListRepository.findById.mockResolvedValue(makePriceList({ isActive: false }));
    priceListRepository.setActive.mockResolvedValue(makePriceList({ isActive: true }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new ActivatePriceListUseCase(
      priceListRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      priceListId: 'price-list-1',
    });

    expect(result.isActive).toBe(true);
  });
});

describe('ListPriceListsUseCase', () => {
  it('pasa el filtro isActive al repositorio', async () => {
    const priceListRepository = makePriceListRepository();
    priceListRepository.findAllByCompany.mockResolvedValue([makePriceList()]);
    const useCase = new ListPriceListsUseCase(priceListRepository);

    const result = await useCase.execute({ companyId: 'company-1', isActive: true });

    expect(result).toHaveLength(1);
  });
});

describe('ListPriceListItemsUseCase', () => {
  it('lista los precios de una lista existente', async () => {
    const priceListRepository = makePriceListRepository();
    priceListRepository.findById.mockResolvedValue(makePriceList());
    priceListRepository.listItems.mockResolvedValue([
      new PriceListItemEntity('price-list-1', 'item-1', '1500.00'),
    ]);
    const useCase = new ListPriceListItemsUseCase(priceListRepository);

    const result = await useCase.execute('price-list-1', 'company-1');

    expect(result).toHaveLength(1);
  });

  it('rechaza si la lista no existe', async () => {
    const priceListRepository = makePriceListRepository();
    priceListRepository.findById.mockResolvedValue(null);
    const useCase = new ListPriceListItemsUseCase(priceListRepository);

    await expect(useCase.execute('no-existe', 'company-1')).rejects.toThrow(
      PriceListNotFoundError,
    );
  });
});

describe('SetPriceListItemUseCase', () => {
  it('fija el precio de un ítem en la lista', async () => {
    const priceListRepository = makePriceListRepository();
    const itemRepository = makeItemRepository();
    priceListRepository.findById.mockResolvedValue(makePriceList());
    itemRepository.findById.mockResolvedValue(makeItem());
    priceListRepository.upsertItem.mockResolvedValue(
      new PriceListItemEntity('price-list-1', 'item-1', '1500.00'),
    );
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new SetPriceListItemUseCase(
      priceListRepository,
      itemRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      priceListId: 'price-list-1',
      itemId: 'item-1',
      price: '1500.00',
    });

    expect(result.price).toBe('1500.00');
  });

  it('RN-CAT-12: rechaza un precio negativo', async () => {
    const priceListRepository = makePriceListRepository();
    const itemRepository = makeItemRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new SetPriceListItemUseCase(
      priceListRepository,
      itemRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        priceListId: 'price-list-1',
        itemId: 'item-1',
        price: '-100',
      }),
    ).rejects.toThrow(InvalidPriceError);
  });

  it('rechaza si el ítem no existe en la empresa', async () => {
    const priceListRepository = makePriceListRepository();
    const itemRepository = makeItemRepository();
    priceListRepository.findById.mockResolvedValue(makePriceList());
    itemRepository.findById.mockResolvedValue(null);
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new SetPriceListItemUseCase(
      priceListRepository,
      itemRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        priceListId: 'price-list-1',
        itemId: 'no-existe',
        price: '100',
      }),
    ).rejects.toThrow(ItemNotFoundError);
  });
});

describe('RemovePriceListItemUseCase', () => {
  it('quita el precio de un ítem de la lista', async () => {
    const priceListRepository = makePriceListRepository();
    priceListRepository.findById.mockResolvedValue(makePriceList());
    priceListRepository.findItem.mockResolvedValue(
      new PriceListItemEntity('price-list-1', 'item-1', '1500.00'),
    );
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new RemovePriceListItemUseCase(
      priceListRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      priceListId: 'price-list-1',
      itemId: 'item-1',
    });

    expect(priceListRepository.removeItem).toHaveBeenCalledWith(
      'price-list-1',
      'item-1',
      FAKE_TRANSACTION_CONTEXT,
    );
  });

  it('rechaza si el ítem no tiene un precio definido en esta lista', async () => {
    const priceListRepository = makePriceListRepository();
    priceListRepository.findById.mockResolvedValue(makePriceList());
    priceListRepository.findItem.mockResolvedValue(null);
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new RemovePriceListItemUseCase(
      priceListRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        priceListId: 'price-list-1',
        itemId: 'item-1',
      }),
    ).rejects.toThrow(ItemNotInPriceListError);
  });
});
