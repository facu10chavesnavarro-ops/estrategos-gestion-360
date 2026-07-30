import { CreateItemUseCase } from '../../src/modules/catalog/application/use-cases/create-item.use-case';
import { UpdateItemUseCase } from '../../src/modules/catalog/application/use-cases/update-item.use-case';
import { DeactivateItemUseCase } from '../../src/modules/catalog/application/use-cases/deactivate-item.use-case';
import { ActivateItemUseCase } from '../../src/modules/catalog/application/use-cases/activate-item.use-case';
import { ItemEntity } from '../../src/modules/catalog/domain/entities/item.entity';
import { ItemRepository } from '../../src/modules/catalog/domain/repositories/item.repository';
import { CategoryRepository } from '../../src/modules/catalog/domain/repositories/category.repository';
import { TaxRepository } from '../../src/modules/catalog/domain/repositories/tax.repository';
import { TaxEntity } from '../../src/modules/catalog/domain/entities/tax.entity';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import {
  ItemNotFoundError,
  DuplicateSkuError,
  MinimumStockWithoutTrackingError,
  InvalidItemCategoryError,
  InvalidItemTaxError,
  ItemAlreadyInTargetStateError,
  InvalidCostPriceError,
  DuplicateBarcodeError,
} from '../../src/modules/catalog/domain/errors/item.errors';
import {
  createFakeUnitOfWork,
  FAKE_TRANSACTION_CONTEXT,
} from '../support/fake-unit-of-work';

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
    overrides.longDescription ?? null,
    overrides.barcode ?? null,
    overrides.costPrice ?? null,
  );
}

function makeItemRepository(): jest.Mocked<ItemRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findBySku: jest.fn(),
    findByBarcode: jest.fn(),
    findAllByCompany: jest.fn(),
    update: jest.fn(),
    setActive: jest.fn(),
  } as jest.Mocked<ItemRepository>;
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

function makeTaxRepository(): jest.Mocked<TaxRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByCompany: jest.fn(),
    updateName: jest.fn(),
    updateAccounts: jest.fn(),
    close: jest.fn(),
  } as jest.Mocked<TaxRepository>;
}

describe('CreateItemUseCase', () => {
  it('crea un Producto cuando el rol autoriza', async () => {
    const itemRepository = makeItemRepository();
    const categoryRepository = makeCategoryRepository();
    const taxRepository = makeTaxRepository();
    itemRepository.findBySku.mockResolvedValue(null);
    itemRepository.create.mockResolvedValue(makeItem());
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateItemUseCase(
      itemRepository,
      categoryRepository,
      taxRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      type: 'PRODUCT',
      sku: 'SKU-1',
      name: 'Resma de papel A4',
      unitOfMeasure: 'unidad',
      tracksStock: true,
    });

    expect(result.sku).toBe('SKU-1');
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'item.create' }),
      FAKE_TRANSACTION_CONTEXT,
    );
  });

  it('rechaza si el rol no autoriza', async () => {
    const itemRepository = makeItemRepository();
    const categoryRepository = makeCategoryRepository();
    const taxRepository = makeTaxRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateItemUseCase(
      itemRepository,
      categoryRepository,
      taxRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Empleado',
        companyId: 'company-1',
        type: 'PRODUCT',
        sku: 'SKU-1',
        name: 'X',
        unitOfMeasure: 'unidad',
      }),
    ).rejects.toThrow(RoleNotAuthorizedError);
  });

  it('RN-CAT-05: rechaza un SKU duplicado en la empresa', async () => {
    const itemRepository = makeItemRepository();
    const categoryRepository = makeCategoryRepository();
    const taxRepository = makeTaxRepository();
    itemRepository.findBySku.mockResolvedValue(makeItem());
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateItemUseCase(
      itemRepository,
      categoryRepository,
      taxRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        type: 'PRODUCT',
        sku: 'SKU-1',
        name: 'X',
        unitOfMeasure: 'unidad',
      }),
    ).rejects.toThrow(DuplicateSkuError);
  });

  it('RN-CAT-07: un Servicio nunca controla stock, aunque se envíe tracksStock=true', async () => {
    const itemRepository = makeItemRepository();
    const categoryRepository = makeCategoryRepository();
    const taxRepository = makeTaxRepository();
    itemRepository.findBySku.mockResolvedValue(null);
    itemRepository.create.mockResolvedValue(makeItem({ type: 'SERVICE', tracksStock: false }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateItemUseCase(
      itemRepository,
      categoryRepository,
      taxRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      type: 'SERVICE',
      sku: 'SRV-1',
      name: 'Consultoría',
      unitOfMeasure: 'hora',
      tracksStock: true,
    });

    expect(itemRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ tracksStock: false }),
      FAKE_TRANSACTION_CONTEXT,
    );
  });

  it('RN-CAT-08: rechaza minimumStock si tracksStock es false', async () => {
    const itemRepository = makeItemRepository();
    const categoryRepository = makeCategoryRepository();
    const taxRepository = makeTaxRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateItemUseCase(
      itemRepository,
      categoryRepository,
      taxRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        type: 'PRODUCT',
        sku: 'SKU-1',
        name: 'X',
        unitOfMeasure: 'unidad',
        tracksStock: false,
        minimumStock: '10',
      }),
    ).rejects.toThrow(MinimumStockWithoutTrackingError);
  });

  it('RN-CAT-02: rechaza una categoría que no pertenece a la empresa', async () => {
    const itemRepository = makeItemRepository();
    const categoryRepository = makeCategoryRepository();
    const taxRepository = makeTaxRepository();
    itemRepository.findBySku.mockResolvedValue(null);
    categoryRepository.findById.mockResolvedValue(null);
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateItemUseCase(
      itemRepository,
      categoryRepository,
      taxRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        type: 'PRODUCT',
        sku: 'SKU-1',
        name: 'X',
        unitOfMeasure: 'unidad',
        categoryId: 'no-existe',
      }),
    ).rejects.toThrow(InvalidItemCategoryError);
  });

  it('RN-CAT-11: rechaza un taxId que no pertenece a la empresa', async () => {
    const itemRepository = makeItemRepository();
    const categoryRepository = makeCategoryRepository();
    const taxRepository = makeTaxRepository();
    itemRepository.findBySku.mockResolvedValue(null);
    taxRepository.findById.mockResolvedValue(null);
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateItemUseCase(
      itemRepository,
      categoryRepository,
      taxRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        type: 'PRODUCT',
        sku: 'SKU-1',
        name: 'X',
        unitOfMeasure: 'unidad',
        taxIds: ['no-existe'],
      }),
    ).rejects.toThrow(InvalidItemTaxError);
  });

  it('acepta más de un impuesto simultáneo (RN-CAT-11)', async () => {
    const itemRepository = makeItemRepository();
    const categoryRepository = makeCategoryRepository();
    const taxRepository = makeTaxRepository();
    itemRepository.findBySku.mockResolvedValue(null);
    taxRepository.findById.mockResolvedValue(
      new TaxEntity('tax-1', 'company-1', 'IVA 21%', 'VAT', '21', new Date(), null, null, null),
    );
    itemRepository.create.mockResolvedValue(makeItem({ taxIds: ['tax-1', 'tax-2'] }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateItemUseCase(
      itemRepository,
      categoryRepository,
      taxRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      type: 'PRODUCT',
      sku: 'SKU-1',
      name: 'X',
      unitOfMeasure: 'unidad',
      taxIds: ['tax-1', 'tax-2'],
    });

    expect(result.taxIds).toEqual(['tax-1', 'tax-2']);
  });

  it('rechaza un costPrice negativo', async () => {
    const itemRepository = makeItemRepository();
    const categoryRepository = makeCategoryRepository();
    const taxRepository = makeTaxRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateItemUseCase(
      itemRepository,
      categoryRepository,
      taxRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        type: 'PRODUCT',
        sku: 'SKU-1',
        name: 'X',
        unitOfMeasure: 'unidad',
        costPrice: '-1',
      }),
    ).rejects.toThrow(InvalidCostPriceError);
  });

  it('rechaza un código de barras ya usado en la empresa', async () => {
    const itemRepository = makeItemRepository();
    const categoryRepository = makeCategoryRepository();
    const taxRepository = makeTaxRepository();
    itemRepository.findBySku.mockResolvedValue(null);
    itemRepository.findByBarcode.mockResolvedValue(makeItem({ barcode: '7791234567890' }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateItemUseCase(
      itemRepository,
      categoryRepository,
      taxRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        type: 'PRODUCT',
        sku: 'SKU-1',
        name: 'X',
        unitOfMeasure: 'unidad',
        barcode: '7791234567890',
      }),
    ).rejects.toThrow(DuplicateBarcodeError);
  });
});

describe('UpdateItemUseCase', () => {
  it('actualiza campos permitidos', async () => {
    const itemRepository = makeItemRepository();
    const categoryRepository = makeCategoryRepository();
    const taxRepository = makeTaxRepository();
    itemRepository.findById.mockResolvedValue(makeItem());
    itemRepository.update.mockResolvedValue(makeItem({ name: 'Actualizado' }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateItemUseCase(
      itemRepository,
      categoryRepository,
      taxRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      itemId: 'item-1',
      name: 'Actualizado',
    });

    expect(result.name).toBe('Actualizado');
  });

  it('rechaza si el ítem no existe', async () => {
    const itemRepository = makeItemRepository();
    const categoryRepository = makeCategoryRepository();
    const taxRepository = makeTaxRepository();
    itemRepository.findById.mockResolvedValue(null);
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateItemUseCase(
      itemRepository,
      categoryRepository,
      taxRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        itemId: 'no-existe',
        name: 'X',
      }),
    ).rejects.toThrow(ItemNotFoundError);
  });

  it('RN-CAT-05: rechaza cambiar a un SKU ya usado por otro ítem', async () => {
    const itemRepository = makeItemRepository();
    const categoryRepository = makeCategoryRepository();
    const taxRepository = makeTaxRepository();
    itemRepository.findById.mockResolvedValue(makeItem({ sku: 'SKU-1' }));
    itemRepository.findBySku.mockResolvedValue(makeItem({ id: 'item-2', sku: 'SKU-2' }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateItemUseCase(
      itemRepository,
      categoryRepository,
      taxRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        itemId: 'item-1',
        sku: 'SKU-2',
      }),
    ).rejects.toThrow(DuplicateSkuError);
  });

  it('RN-CAT-07: un Servicio existente sigue sin controlar stock aunque se lo pida', async () => {
    const itemRepository = makeItemRepository();
    const categoryRepository = makeCategoryRepository();
    const taxRepository = makeTaxRepository();
    itemRepository.findById.mockResolvedValue(makeItem({ type: 'SERVICE', tracksStock: false }));
    itemRepository.update.mockResolvedValue(makeItem({ type: 'SERVICE', tracksStock: false }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateItemUseCase(
      itemRepository,
      categoryRepository,
      taxRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      itemId: 'item-1',
      tracksStock: true,
    });

    expect(itemRepository.update).toHaveBeenCalledWith(
      'item-1',
      expect.objectContaining({ tracksStock: false }),
      FAKE_TRANSACTION_CONTEXT,
    );
  });

  it('rechaza un costPrice negativo', async () => {
    const itemRepository = makeItemRepository();
    const categoryRepository = makeCategoryRepository();
    const taxRepository = makeTaxRepository();
    itemRepository.findById.mockResolvedValue(makeItem());
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateItemUseCase(
      itemRepository,
      categoryRepository,
      taxRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        itemId: 'item-1',
        costPrice: '-5',
      }),
    ).rejects.toThrow(InvalidCostPriceError);
  });

  it('rechaza cambiar a un código de barras ya usado por otro ítem', async () => {
    const itemRepository = makeItemRepository();
    const categoryRepository = makeCategoryRepository();
    const taxRepository = makeTaxRepository();
    itemRepository.findById.mockResolvedValue(makeItem({ barcode: null }));
    itemRepository.findByBarcode.mockResolvedValue(
      makeItem({ id: 'item-2', barcode: '7791234567890' }),
    );
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new UpdateItemUseCase(
      itemRepository,
      categoryRepository,
      taxRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        itemId: 'item-1',
        barcode: '7791234567890',
      }),
    ).rejects.toThrow(DuplicateBarcodeError);
  });
});

describe('DeactivateItemUseCase / ActivateItemUseCase', () => {
  it('desactiva un ítem activo', async () => {
    const itemRepository = makeItemRepository();
    itemRepository.findById.mockResolvedValue(makeItem({ isActive: true }));
    itemRepository.setActive.mockResolvedValue(makeItem({ isActive: false }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new DeactivateItemUseCase(
      itemRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      itemId: 'item-1',
    });

    expect(result.isActive).toBe(false);
  });

  it('rechaza desactivar un ítem ya inactivo', async () => {
    const itemRepository = makeItemRepository();
    itemRepository.findById.mockResolvedValue(makeItem({ isActive: false }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new DeactivateItemUseCase(
      itemRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        itemId: 'item-1',
      }),
    ).rejects.toThrow(ItemAlreadyInTargetStateError);
  });

  it('reactiva un ítem inactivo', async () => {
    const itemRepository = makeItemRepository();
    itemRepository.findById.mockResolvedValue(makeItem({ isActive: false }));
    itemRepository.setActive.mockResolvedValue(makeItem({ isActive: true }));
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new ActivateItemUseCase(
      itemRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      itemId: 'item-1',
    });

    expect(result.isActive).toBe(true);
  });
});
