import { CreateStockTransferUseCase } from '../../src/modules/inventory/application/use-cases/create-stock-transfer.use-case';
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
import { SameWarehouseTransferError } from '../../src/modules/inventory/domain/errors/stock-movement.errors';
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
    overrides.voucherId ?? null,
    overrides.userId ?? 'user-1',
    overrides.createdAt ?? new Date(),
  );
}

describe('CreateStockTransferUseCase', () => {
  function makeSut() {
    const warehouseRepository = makeWarehouseRepository();
    const itemRepository = makeItemRepository();
    const companyRepository = makeCompanyRepository();
    const applyStockMovementService = makeApplyStockMovementService();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateStockTransferUseCase(
      warehouseRepository,
      itemRepository,
      companyRepository,
      applyStockMovementService,
      auditLogRepository,
      createFakeUnitOfWork(),
    );
    warehouseRepository.findById.mockImplementation(async (id) =>
      makeWarehouse({ id, branchId: id === 'warehouse-2' ? 'branch-2' : 'branch-1' }),
    );
    itemRepository.findById.mockResolvedValue(makeItem());
    companyRepository.findById.mockResolvedValue(makeCompany());
    applyStockMovementService.apply.mockImplementation(async (input) =>
      makeMovement({
        type: input.type as 'TRANSFER_OUT' | 'TRANSFER_IN',
        warehouseId: input.warehouseId,
        transferGroupId: input.transferGroupId ?? null,
        unitCost: input.unitCost ?? '100.0000',
      }),
    );
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

  it('RN-STK-08: genera un par TRANSFER_OUT/TRANSFER_IN con el mismo transferGroupId', async () => {
    const { useCase, applyStockMovementService, auditLogRepository } = makeSut();

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

    const applyCalls = applyStockMovementService.apply.mock.calls;
    expect(applyCalls).toHaveLength(2);
    const [outInput] = applyCalls[0];
    const [inInput] = applyCalls[1];
    expect(outInput.type).toBe('TRANSFER_OUT');
    expect(outInput.direction).toBe('OUT');
    expect(inInput.type).toBe('TRANSFER_IN');
    expect(inInput.direction).toBe('IN');
    expect(outInput.transferGroupId).toBe(inInput.transferGroupId);

    // Una sola auditoría para todo el hecho de negocio, no dos.
    expect(auditLogRepository.record).toHaveBeenCalledTimes(1);
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'stock.transfer' }),
      expect.anything(),
    );
  });

  it('el costo que viaja al destino es el unitCost devuelto por la salida', async () => {
    const { useCase, applyStockMovementService } = makeSut();
    applyStockMovementService.apply.mockImplementationOnce(async (input) =>
      makeMovement({ type: 'TRANSFER_OUT', warehouseId: input.warehouseId, unitCost: '175.0000' }),
    );

    await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      fromWarehouseId: 'warehouse-1',
      toWarehouseId: 'warehouse-2',
      itemId: 'item-1',
      quantity: '5',
      reason: 'Reposición',
    });

    const [, inCall] = applyStockMovementService.apply.mock.calls;
    const [inInput] = inCall;
    expect(inInput.unitCost).toBe('175.0000');
  });

  it('resuelve allowNegativeStock desde la empresa y lo pasa a ambas llamadas', async () => {
    const { useCase, applyStockMovementService, companyRepository } = makeSut();
    companyRepository.findById.mockResolvedValue(makeCompany({ allowNegativeStock: true }));

    await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      fromWarehouseId: 'warehouse-1',
      toWarehouseId: 'warehouse-2',
      itemId: 'item-1',
      quantity: '5',
      reason: 'Reposición',
    });

    const [[outInput], [inInput]] = applyStockMovementService.apply.mock.calls;
    expect(outInput.allowNegativeStock).toBe(true);
    expect(inInput.allowNegativeStock).toBe(true);
  });

  it('propaga el error de ApplyStockMovementService (ej. stock insuficiente en el origen)', async () => {
    const { useCase, applyStockMovementService } = makeSut();
    applyStockMovementService.apply.mockRejectedValueOnce(new Error('stock insuficiente'));

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
    ).rejects.toThrow('stock insuficiente');
  });
});
