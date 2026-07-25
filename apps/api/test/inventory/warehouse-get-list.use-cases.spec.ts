import { GetWarehouseByIdUseCase } from '../../src/modules/inventory/application/use-cases/get-warehouse-by-id.use-case';
import { ListWarehousesUseCase } from '../../src/modules/inventory/application/use-cases/list-warehouses.use-case';
import { WarehouseEntity } from '../../src/modules/inventory/domain/entities/warehouse.entity';
import { WarehouseRepository } from '../../src/modules/inventory/domain/repositories/warehouse.repository';
import { WarehouseNotFoundError } from '../../src/modules/inventory/domain/errors/warehouse.errors';

function makeWarehouse(overrides: Partial<WarehouseEntity> = {}): WarehouseEntity {
  return new WarehouseEntity(
    overrides.id ?? 'warehouse-1',
    overrides.companyId ?? 'company-1',
    overrides.branchId ?? 'branch-1',
    overrides.name ?? 'Depósito Principal',
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

describe('GetWarehouseByIdUseCase', () => {
  it('devuelve el depósito cuando existe en la empresa', async () => {
    const warehouseRepository = makeWarehouseRepository();
    warehouseRepository.findById.mockResolvedValue(makeWarehouse());
    const useCase = new GetWarehouseByIdUseCase(warehouseRepository);

    const result = await useCase.execute('warehouse-1', 'company-1');

    expect(result.id).toBe('warehouse-1');
  });

  it('lanza WarehouseNotFoundError si no existe', async () => {
    const warehouseRepository = makeWarehouseRepository();
    warehouseRepository.findById.mockResolvedValue(null);
    const useCase = new GetWarehouseByIdUseCase(warehouseRepository);

    await expect(useCase.execute('no-existe', 'company-1')).rejects.toThrow(
      WarehouseNotFoundError,
    );
  });
});

describe('ListWarehousesUseCase', () => {
  it('lista los depósitos de una sucursal', async () => {
    const warehouseRepository = makeWarehouseRepository();
    warehouseRepository.findAllByBranch.mockResolvedValue([makeWarehouse()]);
    const useCase = new ListWarehousesUseCase(warehouseRepository);

    const result = await useCase.execute('branch-1');

    expect(result).toHaveLength(1);
    expect(warehouseRepository.findAllByBranch).toHaveBeenCalledWith('branch-1');
  });
});
