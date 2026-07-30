import { CreateStockAdjustmentUseCase } from '../../src/modules/inventory/application/use-cases/create-stock-adjustment.use-case';
import { WarehouseEntity } from '../../src/modules/inventory/domain/entities/warehouse.entity';
import { StockMovementEntity } from '../../src/modules/inventory/domain/entities/stock-movement.entity';
import { WarehouseRepository } from '../../src/modules/inventory/domain/repositories/warehouse.repository';
import { ItemRepository } from '../../src/modules/catalog/domain/repositories/item.repository';
import { ItemEntity } from '../../src/modules/catalog/domain/entities/item.entity';
import { CompanyRepository } from '../../src/modules/companies/domain/repositories/company.repository';
import { CompanyEntity } from '../../src/modules/companies/domain/entities/company.entity';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { ApplyStockMovementService } from '../../src/modules/inventory/application/services/apply-stock-movement.service';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import { WarehouseNotFoundError } from '../../src/modules/inventory/domain/errors/warehouse.errors';
import { ItemNotFoundError } from '../../src/modules/catalog/domain/errors/item.errors';
import {
  ItemDoesNotTrackStockError,
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
    overrides.longDescription ?? null,
    overrides.barcode ?? null,
    overrides.costPrice ?? null,
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

function makeCompanyRepository(): jest.Mocked<CompanyRepository> {
  return {
    create: jest.fn(),
    findAllForUser: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    setActive: jest.fn(),
  } as jest.Mocked<CompanyRepository>;
}

function makeApplyStockMovementService(): jest.Mocked<ApplyStockMovementService> {
  return {
    apply: jest.fn(),
  } as unknown as jest.Mocked<ApplyStockMovementService>;
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
    overrides.voucherId ?? null,
    overrides.userId ?? 'user-1',
    overrides.createdAt ?? new Date(),
  );
}

describe('CreateStockAdjustmentUseCase', () => {
  function makeSut() {
    const warehouseRepository = makeWarehouseRepository();
    const itemRepository = makeItemRepository();
    const companyRepository = makeCompanyRepository();
    const applyStockMovementService = makeApplyStockMovementService();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateStockAdjustmentUseCase(
      warehouseRepository,
      itemRepository,
      companyRepository,
      applyStockMovementService,
      auditLogRepository,
      createFakeUnitOfWork(),
    );
    warehouseRepository.findById.mockResolvedValue(makeWarehouse());
    itemRepository.findById.mockResolvedValue(makeItem());
    applyStockMovementService.apply.mockResolvedValue(makeStockMovement());
    return {
      warehouseRepository,
      itemRepository,
      companyRepository,
      applyStockMovementService,
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
    const { useCase } = makeSut();

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

  it('delega en ApplyStockMovementService con type ADJUSTMENT_IN en una entrada', async () => {
    const { useCase, applyStockMovementService } = makeSut();

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

    expect(applyStockMovementService.apply).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        itemId: 'item-1',
        warehouseId: 'warehouse-1',
        direction: 'IN',
        type: 'ADJUSTMENT_IN',
        quantity: '10',
        unitCost: '100',
        userId: 'user-1',
      }),
      expect.anything(),
    );
  });

  it('delega en ApplyStockMovementService con type ADJUSTMENT_OUT y allowNegativeStock resuelto en una salida', async () => {
    const { useCase, applyStockMovementService, companyRepository } = makeSut();
    companyRepository.findById.mockResolvedValue(makeCompany({ allowNegativeStock: true }));

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

    expect(companyRepository.findById).toHaveBeenCalledWith('company-1', expect.anything());
    expect(applyStockMovementService.apply).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'OUT',
        type: 'ADJUSTMENT_OUT',
        quantity: '5',
        reason: 'Rotura',
        allowNegativeStock: true,
      }),
      expect.anything(),
    );
  });

  it('registra una auditoría con el id del movimiento devuelto por ApplyStockMovementService', async () => {
    const { useCase, applyStockMovementService, auditLogRepository } = makeSut();
    applyStockMovementService.apply.mockResolvedValue(makeStockMovement({ id: 'movement-42' }));

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

    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'stock.adjustment_in', entityId: 'movement-42' }),
      expect.anything(),
    );
  });

  it('propaga el error de ApplyStockMovementService (ej. stock insuficiente)', async () => {
    const { useCase, applyStockMovementService } = makeSut();
    applyStockMovementService.apply.mockRejectedValue(new Error('stock insuficiente'));

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
    ).rejects.toThrow('stock insuficiente');
  });
});
