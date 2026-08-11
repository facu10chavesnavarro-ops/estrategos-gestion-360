import { ListStockUseCase } from '../../src/modules/inventory/application/use-cases/list-stock.use-case';
import { ListStockMovementsUseCase } from '../../src/modules/inventory/application/use-cases/list-stock-movements.use-case';
import { StockEntity } from '../../src/modules/inventory/domain/entities/stock.entity';
import { StockMovementEntity } from '../../src/modules/inventory/domain/entities/stock-movement.entity';
import { StockRepository } from '../../src/modules/inventory/domain/repositories/stock.repository';
import { StockMovementRepository } from '../../src/modules/inventory/domain/repositories/stock-movement.repository';

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

describe('ListStockUseCase', () => {
  it('pasa el filtro itemId al repositorio', async () => {
    const stockRepository = makeStockRepository();
    stockRepository.findAllByWarehouse.mockResolvedValue([
      new StockEntity('company-1', 'item-1', 'warehouse-1', '10.000', '100.0000'),
    ]);
    const useCase = new ListStockUseCase(stockRepository);

    const result = await useCase.execute({
      companyId: 'company-1',
      warehouseId: 'warehouse-1',
      itemId: 'item-1',
    });

    expect(result).toHaveLength(1);
    expect(stockRepository.findAllByWarehouse).toHaveBeenCalledWith('warehouse-1', 'company-1', {
      itemId: 'item-1',
    });
  });

  // Auditoría de seguridad (hallazgo A1, IDOR): `findAllByWarehouse` ahora
  // exige companyId — el use case debe reenviar siempre el del contexto
  // verificado. La exclusión real de filas de otra empresa se prueba
  // contra DB real en test/security/multi-tenant-isolation.integration-spec.ts.
  it('reenvía el companyId del contexto al repositorio, nunca uno distinto', async () => {
    const stockRepository = makeStockRepository();
    stockRepository.findAllByWarehouse.mockResolvedValue([]);
    const useCase = new ListStockUseCase(stockRepository);

    await useCase.execute({ companyId: 'company-1', warehouseId: 'warehouse-de-otra-empresa' });

    expect(stockRepository.findAllByWarehouse).toHaveBeenCalledWith(
      'warehouse-de-otra-empresa',
      'company-1',
      { itemId: undefined },
    );
    expect(stockRepository.findAllByWarehouse).not.toHaveBeenCalledWith(
      'warehouse-de-otra-empresa',
      'otra-empresa',
      expect.anything(),
    );
  });
});

describe('ListStockMovementsUseCase', () => {
  it('pasa los filtros al repositorio', async () => {
    const stockMovementRepository = makeStockMovementRepository();
    stockMovementRepository.findAllByWarehouse.mockResolvedValue([
      new StockMovementEntity(
        'movement-1',
        'company-1',
        'item-1',
        'warehouse-1',
        'ADJUSTMENT_IN',
        '10.000',
        '100.0000',
        null,
        null,
        null,
        'user-1',
        new Date(),
      ),
    ]);
    const useCase = new ListStockMovementsUseCase(stockMovementRepository);

    const result = await useCase.execute({
      companyId: 'company-1',
      warehouseId: 'warehouse-1',
      itemId: 'item-1',
      type: 'ADJUSTMENT_IN',
    });

    expect(result).toHaveLength(1);
    expect(stockMovementRepository.findAllByWarehouse).toHaveBeenCalledWith(
      'warehouse-1',
      'company-1',
      {
        itemId: 'item-1',
        type: 'ADJUSTMENT_IN',
        from: undefined,
        to: undefined,
      },
    );
  });

  // Auditoría de seguridad (hallazgo A1, IDOR): `findAllByWarehouse` ahora
  // exige companyId — mismo criterio que ListStockUseCase arriba.
  it('reenvía el companyId del contexto al repositorio, nunca uno distinto', async () => {
    const stockMovementRepository = makeStockMovementRepository();
    stockMovementRepository.findAllByWarehouse.mockResolvedValue([]);
    const useCase = new ListStockMovementsUseCase(stockMovementRepository);

    await useCase.execute({ companyId: 'company-1', warehouseId: 'warehouse-de-otra-empresa' });

    expect(stockMovementRepository.findAllByWarehouse).toHaveBeenCalledWith(
      'warehouse-de-otra-empresa',
      'company-1',
      { itemId: undefined, type: undefined, from: undefined, to: undefined },
    );
    expect(stockMovementRepository.findAllByWarehouse).not.toHaveBeenCalledWith(
      'warehouse-de-otra-empresa',
      'otra-empresa',
      expect.anything(),
    );
  });
});
