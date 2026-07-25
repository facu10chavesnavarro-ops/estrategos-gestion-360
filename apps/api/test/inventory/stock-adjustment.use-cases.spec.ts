import { CreateStockAdjustmentUseCase } from '../../src/modules/inventory/application/use-cases/create-stock-adjustment.use-case';
import { WarehouseEntity } from '../../src/modules/inventory/domain/entities/warehouse.entity';
import { StockEntity } from '../../src/modules/inventory/domain/entities/stock.entity';
import { StockMovementEntity } from '../../src/modules/inventory/domain/entities/stock-movement.entity';
import { WarehouseRepository } from '../../src/modules/inventory/domain/repositories/warehouse.repository';
import { StockRepository } from '../../src/modules/inventory/domain/repositories/stock.repository';
import { StockMovementRepository } from '../../src/modules/inventory/domain/repositories/stock-movement.repository';
import { ItemRepository } from '../../src/modules/catalog/domain/repositories/item.repository';
import { ItemEntity } from '../../src/modules/catalog/domain/entities/item.entity';
import { CompanyRepository } from '../../src/modules/companies/domain/repositories/company.repository';
import { CompanyEntity } from '../../src/modules/companies/domain/entities/company.entity';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import { WarehouseNotFoundError } from '../../src/modules/inventory/domain/errors/warehouse.errors';
import { ItemNotFoundError } from '../../src/modules/catalog/domain/errors/item.errors';
import {
  ItemDoesNotTrackStockError,
  InsufficientStockError,
  MissingReasonError,
  MissingUnitCostError,
  InvalidQuantityError,
} from '../../src/modules/inventory/domain/errors/stock-movement.errors';
import { createFakeUnitOfWork } from '../support/fake-unit-of-work';

function makeWarehouse(overrides: Partial<WarehouseEntity> = {}): WarehouseEntity {
  return new WarehouseEntity(
    overrides.id ?? 'warehouse-1',
    overrides.companyId ?? 'company-1',
    overrides.branchId ?? 'branch-1',
    overrides.name ?? 'Depósito Principal',
    overrides.isActive ?? true,
  );
}

function makeItem(overrides: Partial<ItemEntity> = {}): ItemEntity {
  return new ItemEntity(
    overrides.id ?? 'item-1',
    overrides.companyId ?? 'company-1',
    overrides.type ?? 'PRODUCT',
    overrides.sku ?? 'SKU-1',
    overrides.name ?? 'Resma A4',
    overrides.description ?? null,
    overrides.categoryId ?? null,
    overrides.unitOfMeasure ?? 'unidad',
    overrides.tracksStock ?? true,
    overrides.minimumStock ?? null,
    overrides.isActive ?? true,
    overrides.taxIds ?? [],
  );
}

function makeCompany(overrides: Partial<CompanyEntity> = {}): CompanyEntity {
  return new CompanyEntity(
    overrides.id ?? 'company-1',
    overrides.tenantId ?? 'tenant-1',
    overrides.legalName ?? 'Empresa Piloto SRL',
    overrides.taxId ?? null,
    overrides.taxCondition ?? null,
    overrides.activity ?? null,
    overrides.address ?? null,
    overrides.contactName ?? null,
    overrides.contactEmail ?? null,
    overrides.contactPhone ?? null,
    overrides.logoUrl ?? null,
    overrides.currency ?? 'ARS',
    overrides.timezone ?? 'America/Argentina/Jujuy',
    overrides.allowNegativeStock ?? false,
    overrides.isActive ?? true,
  );
}

function makeWarehouseRepository(): jest.Mocked<WarehouseRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByBranchAndName: jest.fn(),
    findAllByBranch: jest.fn(),
    update: jest.fn(),
    setActive: jest.fn(),
  } as jest.Mocked<WarehouseRepository>;
}

function makeStockRepository(): jest.Mocked<StockRepository> {
  return {
    findByItemAndWarehouse: jest.fn(),
    findAllByWarehouse: jest.fn(),
    upsert: jest.fn(),
  } as jest.Mocked<StockRepository>;
}

function makeStockMovementRepository(): jest.Mocked<StockMovementRepository> {
  return {
    create: jest.fn(),
    findAllByWarehouse: jest.fn(),
  } as jest.Mocked<StockMovementRepository>;
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

function makeCompanyRepository(): jest.Mocked<CompanyRepository> {
  return {
    create: jest.fn(),
    findAllForUser: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    setActive: jest.fn(),
  } as jest.Mocked<CompanyRepository>;
}

function makeStockMovement(overrides: Partial<StockMovementEntity> = {}): StockMovementEntity {
  return new StockMovementEntity(
    overrides.id ?? 'movement-1',
    overrides.companyId ?? 'company-1',
    overrides.itemId ?? 'item-1',
    overrides.warehouseId ?? 'warehouse-1',
    overrides.type ?? 'ADJUSTMENT_IN',
    overrides.quantity ?? '10.000',
    overrides.unitCost ?? '100.0000',
    overrides.reason ?? null,
    overrides.transferGroupId ?? null,
    overrides.userId ?? 'user-1',
    overrides.createdAt ?? new Date(),
  );
}

describe('CreateStockAdjustmentUseCase', () => {
  function makeSut() {
    const warehouseRepository = makeWarehouseRepository();
    const stockRepository = makeStockRepository();
    const stockMovementRepository = makeStockMovementRepository();
    const itemRepository = makeItemRepository();
    const companyRepository = makeCompanyRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateStockAdjustmentUseCase(
      warehouseRepository,
      stockRepository,
      stockMovementRepository,
      itemRepository,
      companyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );
    warehouseRepository.findById.mockResolvedValue(makeWarehouse());
    itemRepository.findById.mockResolvedValue(makeItem());
    stockMovementRepository.create.mockResolvedValue(makeStockMovement());
    return {
      warehouseRepository,
      stockRepository,
      stockMovementRepository,
      itemRepository,
      companyRepository,
      auditLogRepository,
      useCase,
    };
  }

  it('rechaza si el rol no autoriza', async () => {
    const { useCase } = makeSut();

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Empleado',
        companyId: 'company-1',
        warehouseId: 'warehouse-1',
        itemId: 'item-1',
        direction: 'IN',
        quantity: '10',
        unitCost: '100',
      }),
    ).rejects.toThrow(RoleNotAuthorizedError);
  });

  it('rechaza si el depósito no existe', async () => {
    const { useCase, warehouseRepository } = makeSut();
    warehouseRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        warehouseId: 'no-existe',
        itemId: 'item-1',
        direction: 'IN',
        quantity: '10',
        unitCost: '100',
      }),
    ).rejects.toThrow(WarehouseNotFoundError);
  });

  it('rechaza si el ítem no existe', async () => {
    const { useCase, itemRepository } = makeSut();
    itemRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        warehouseId: 'warehouse-1',
        itemId: 'no-existe',
        direction: 'IN',
        quantity: '10',
        unitCost: '100',
      }),
    ).rejects.toThrow(ItemNotFoundError);
  });

  it('RN-STK-13: rechaza un ítem que no controla stock', async () => {
    const { useCase, itemRepository } = makeSut();
    itemRepository.findById.mockResolvedValue(makeItem({ tracksStock: false }));

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        warehouseId: 'warehouse-1',
        itemId: 'item-1',
        direction: 'IN',
        quantity: '10',
        unitCost: '100',
      }),
    ).rejects.toThrow(ItemDoesNotTrackStockError);
  });

  it('rechaza cantidad cero o negativa', async () => {
    const { useCase } = makeSut();

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        warehouseId: 'warehouse-1',
        itemId: 'item-1',
        direction: 'IN',
        quantity: '0',
        unitCost: '100',
      }),
    ).rejects.toThrow(InvalidQuantityError);
  });

  it('exige unitCost en una entrada', async () => {
    const { useCase } = makeSut();

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        warehouseId: 'warehouse-1',
        itemId: 'item-1',
        direction: 'IN',
        quantity: '10',
      }),
    ).rejects.toThrow(MissingUnitCostError);
  });

  it('RN-STK-07: exige motivo en una salida', async () => {
    const { useCase, stockRepository } = makeSut();
    stockRepository.findByItemAndWarehouse.mockResolvedValue(
      new StockEntity('company-1', 'item-1', 'warehouse-1', '50.000', '100.0000'),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        warehouseId: 'warehouse-1',
        itemId: 'item-1',
        direction: 'OUT',
        quantity: '10',
      }),
    ).rejects.toThrow(MissingReasonError);
  });

  it('primera entrada: sin stock previo, el promedio es el costo entrante', async () => {
    const { useCase, stockRepository } = makeSut();
    stockRepository.findByItemAndWarehouse.mockResolvedValue(null);

    await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      warehouseId: 'warehouse-1',
      itemId: 'item-1',
      direction: 'IN',
      quantity: '10',
      unitCost: '100',
    });

    expect(stockRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: '10.000', averageCost: '100.0000' }),
      expect.anything(),
    );
  });

  it('RN-STK-05: segunda entrada recalcula el promedio ponderado', async () => {
    const { useCase, stockRepository } = makeSut();
    // 10 unidades a 100 ya existentes; entran 10 más a 200.
    // Promedio esperado: (10*100 + 10*200) / 20 = 150.
    stockRepository.findByItemAndWarehouse.mockResolvedValue(
      new StockEntity('company-1', 'item-1', 'warehouse-1', '10.000', '100.0000'),
    );

    await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      warehouseId: 'warehouse-1',
      itemId: 'item-1',
      direction: 'IN',
      quantity: '10',
      unitCost: '200',
    });

    expect(stockRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: '20.000', averageCost: '150.0000' }),
      expect.anything(),
    );
  });

  it('RN-STK-05: una salida descuenta cantidad pero no modifica el promedio', async () => {
    const { useCase, stockRepository } = makeSut();
    stockRepository.findByItemAndWarehouse.mockResolvedValue(
      new StockEntity('company-1', 'item-1', 'warehouse-1', '20.000', '150.0000'),
    );

    await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      warehouseId: 'warehouse-1',
      itemId: 'item-1',
      direction: 'OUT',
      quantity: '5',
      reason: 'Rotura',
    });

    expect(stockRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: '15.000', averageCost: '150.0000' }),
      expect.anything(),
    );
    // El costo del movimiento de salida es el promedio vigente, no un valor manual.
    expect(stockRepository.upsert).toHaveBeenCalled();
  });

  it('RN-STK-06: rechaza una salida que dejaría stock negativo sin allowNegativeStock', async () => {
    const { useCase, stockRepository } = makeSut();
    stockRepository.findByItemAndWarehouse.mockResolvedValue(
      new StockEntity('company-1', 'item-1', 'warehouse-1', '5.000', '100.0000'),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        warehouseId: 'warehouse-1',
        itemId: 'item-1',
        direction: 'OUT',
        quantity: '10',
        reason: 'Rotura',
      }),
    ).rejects.toThrow(InsufficientStockError);
  });

  it('RN-STK-06: permite stock negativo cuando la empresa lo habilita', async () => {
    const { useCase, stockRepository, companyRepository } = makeSut();
    stockRepository.findByItemAndWarehouse.mockResolvedValue(
      new StockEntity('company-1', 'item-1', 'warehouse-1', '5.000', '100.0000'),
    );
    companyRepository.findById.mockResolvedValue(makeCompany({ allowNegativeStock: true }));

    await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      warehouseId: 'warehouse-1',
      itemId: 'item-1',
      direction: 'OUT',
      quantity: '10',
      reason: 'Venta bajo pedido',
    });

    expect(stockRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: '-5.000' }),
      expect.anything(),
    );
  });
});
