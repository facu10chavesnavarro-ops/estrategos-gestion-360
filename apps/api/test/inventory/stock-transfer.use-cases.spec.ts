import { CreateStockTransferUseCase } from '../../src/modules/inventory/application/use-cases/create-stock-transfer.use-case';
import { WarehouseEntity } from '../../src/modules/inventory/domain/entities/warehouse.entity';
import { StockEntity } from '../../src/modules/inventory/domain/entities/stock.entity';
import { StockMovementEntity } from '../../src/modules/inventory/domain/entities/stock-movement.entity';
import { WarehouseRepository } from '../../src/modules/inventory/domain/repositories/warehouse.repository';
import { StockRepository } from '../../src/modules/inventory/domain/repositories/stock.repository';
import { StockMovementRepository } from '../../src/modules/inventory/domain/repositories/stock-movement.repository';
import { ItemRepository } from '../../src/modules/catalog/domain/repositories/item.repository';
import { ItemEntity } from '../../src/modules/catalog/domain/entities/item.entity';
import { CompanyRepository } from '../../src/modules/companies/domain/repositories/company.repository';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import {
  InsufficientStockError,
  SameWarehouseTransferError,
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

function makeMovement(overrides: Partial<StockMovementEntity> = {}): StockMovementEntity {
  return new StockMovementEntity(
    overrides.id ?? 'movement-1',
    overrides.companyId ?? 'company-1',
    overrides.itemId ?? 'item-1',
    overrides.warehouseId ?? 'warehouse-1',
    overrides.type ?? 'TRANSFER_OUT',
    overrides.quantity ?? '5.000',
    overrides.unitCost ?? '100.0000',
    overrides.reason ?? 'Reposición',
    overrides.transferGroupId ?? 'group-1',
    overrides.userId ?? 'user-1',
    overrides.createdAt ?? new Date(),
  );
}

describe('CreateStockTransferUseCase', () => {
  function makeSut() {
    const warehouseRepository = makeWarehouseRepository();
    const stockRepository = makeStockRepository();
    const stockMovementRepository = makeStockMovementRepository();
    const itemRepository = makeItemRepository();
    const companyRepository = makeCompanyRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateStockTransferUseCase(
      warehouseRepository,
      stockRepository,
      stockMovementRepository,
      itemRepository,
      companyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );
    warehouseRepository.findById.mockImplementation(async (id) =>
      makeWarehouse({ id, branchId: id === 'warehouse-2' ? 'branch-2' : 'branch-1' }),
    );
    itemRepository.findById.mockResolvedValue(makeItem());
    stockMovementRepository.create.mockResolvedValue(makeMovement());
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
        fromWarehouseId: 'warehouse-1',
        toWarehouseId: 'warehouse-2',
        itemId: 'item-1',
        quantity: '5',
        reason: 'Reposición',
      }),
    ).rejects.toThrow(RoleNotAuthorizedError);
  });

  it('RN-STK-09: rechaza transferir a sí mismo', async () => {
    const { useCase } = makeSut();

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        fromWarehouseId: 'warehouse-1',
        toWarehouseId: 'warehouse-1',
        itemId: 'item-1',
        quantity: '5',
        reason: 'Reposición',
      }),
    ).rejects.toThrow(SameWarehouseTransferError);
  });

  it('RN-STK-06: rechaza si el origen no tiene stock suficiente', async () => {
    const { useCase, stockRepository } = makeSut();
    stockRepository.findByItemAndWarehouse.mockImplementation(async (_itemId, warehouseId) =>
      warehouseId === 'warehouse-1'
        ? new StockEntity('company-1', 'item-1', 'warehouse-1', '2.000', '100.0000')
        : null,
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        fromWarehouseId: 'warehouse-1',
        toWarehouseId: 'warehouse-2',
        itemId: 'item-1',
        quantity: '5',
        reason: 'Reposición',
      }),
    ).rejects.toThrow(InsufficientStockError);
  });

  it('RN-STK-08: genera un par TRANSFER_OUT/TRANSFER_IN con el mismo transferGroupId', async () => {
    const { useCase, stockRepository, stockMovementRepository, auditLogRepository } = makeSut();
    stockRepository.findByItemAndWarehouse.mockImplementation(async (_itemId, warehouseId) =>
      warehouseId === 'warehouse-1'
        ? new StockEntity('company-1', 'item-1', 'warehouse-1', '20.000', '100.0000')
        : null,
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      fromWarehouseId: 'warehouse-1',
      toWarehouseId: 'warehouse-2',
      itemId: 'item-1',
      quantity: '5',
      reason: 'Reposición',
    });

    expect(result.outMovement).toBeDefined();
    expect(result.inMovement).toBeDefined();

    const createCalls = stockMovementRepository.create.mock.calls;
    expect(createCalls).toHaveLength(2);
    const [outCall, inCall] = createCalls.map((call) => call[0]);
    expect(outCall.type).toBe('TRANSFER_OUT');
    expect(inCall.type).toBe('TRANSFER_IN');
    expect(outCall.transferGroupId).toBe(inCall.transferGroupId);

    // El costo que viaja es el averageCost vigente en el origen (100).
    expect(outCall.unitCost).toBe('100.0000');
    expect(inCall.unitCost).toBe('100.0000');

    // Origen: 20 - 5 = 15, promedio sin cambios.
    expect(stockRepository.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ warehouseId: 'warehouse-1', quantity: '15.000', averageCost: '100.0000' }),
      expect.anything(),
    );
    // Destino sin stock previo: cantidad = 5, promedio = costo entrante (100).
    expect(stockRepository.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ warehouseId: 'warehouse-2', quantity: '5.000', averageCost: '100.0000' }),
      expect.anything(),
    );

    // Una sola auditoría para todo el hecho de negocio, no dos.
    expect(auditLogRepository.record).toHaveBeenCalledTimes(1);
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'stock.transfer' }),
      expect.anything(),
    );
  });

  it('recalcula el promedio ponderado del destino si ya tenía stock a otro costo', async () => {
    const { useCase, stockRepository } = makeSut();
    stockRepository.findByItemAndWarehouse.mockImplementation(async (_itemId, warehouseId) => {
      if (warehouseId === 'warehouse-1') {
        return new StockEntity('company-1', 'item-1', 'warehouse-1', '20.000', '100.0000');
      }
      // El destino ya tiene 10 unidades a 200.
      return new StockEntity('company-1', 'item-1', 'warehouse-2', '10.000', '200.0000');
    });

    await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      fromWarehouseId: 'warehouse-1',
      toWarehouseId: 'warehouse-2',
      itemId: 'item-1',
      quantity: '10',
      reason: 'Reposición',
    });

    // Destino: (10*200 + 10*100) / 20 = 150.
    expect(stockRepository.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ warehouseId: 'warehouse-2', quantity: '20.000', averageCost: '150.0000' }),
      expect.anything(),
    );
  });
});
