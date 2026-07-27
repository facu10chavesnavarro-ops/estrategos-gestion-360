import { ApplyStockMovementService } from '../../src/modules/inventory/application/services/apply-stock-movement.service';
import { StockEntity } from '../../src/modules/inventory/domain/entities/stock.entity';
import { StockMovementEntity } from '../../src/modules/inventory/domain/entities/stock-movement.entity';
import { StockRepository } from '../../src/modules/inventory/domain/repositories/stock.repository';
import { StockMovementRepository } from '../../src/modules/inventory/domain/repositories/stock-movement.repository';
import { InsufficientStockError } from '../../src/modules/inventory/domain/errors/stock-movement.errors';
import { FAKE_TRANSACTION_CONTEXT } from '../support/fake-unit-of-work';

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

function makeMovement(overrides: Partial<StockMovementEntity> = {}): StockMovementEntity {
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

describe('ApplyStockMovementService', () => {
  function makeSut() {
    const stockRepository = makeStockRepository();
    const stockMovementRepository = makeStockMovementRepository();
    const service = new ApplyStockMovementService(stockRepository, stockMovementRepository);
    stockMovementRepository.create.mockResolvedValue(makeMovement());
    return { stockRepository, stockMovementRepository, service };
  }

  it('primera entrada: sin stock previo, el promedio es el costo entrante', async () => {
    const { service, stockRepository } = makeSut();
    stockRepository.findByItemAndWarehouse.mockResolvedValue(null);

    await service.apply(
      {
        companyId: 'company-1',
        itemId: 'item-1',
        warehouseId: 'warehouse-1',
        direction: 'IN',
        type: 'ADJUSTMENT_IN',
        quantity: '10',
        unitCost: '100',
        userId: 'user-1',
        allowNegativeStock: false,
      },
      FAKE_TRANSACTION_CONTEXT,
    );

    expect(stockRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: '10.000', averageCost: '100.0000' }),
      expect.anything(),
    );
  });

  it('RN-STK-05: segunda entrada recalcula el promedio ponderado', async () => {
    const { service, stockRepository } = makeSut();
    // 10 unidades a 100 ya existentes; entran 10 más a 200.
    // Promedio esperado: (10*100 + 10*200) / 20 = 150.
    stockRepository.findByItemAndWarehouse.mockResolvedValue(
      new StockEntity('company-1', 'item-1', 'warehouse-1', '10.000', '100.0000'),
    );

    await service.apply(
      {
        companyId: 'company-1',
        itemId: 'item-1',
        warehouseId: 'warehouse-1',
        direction: 'IN',
        type: 'ADJUSTMENT_IN',
        quantity: '10',
        unitCost: '200',
        userId: 'user-1',
        allowNegativeStock: false,
      },
      FAKE_TRANSACTION_CONTEXT,
    );

    expect(stockRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: '20.000', averageCost: '150.0000' }),
      expect.anything(),
    );
  });

  it('RN-STK-05: una salida descuenta cantidad pero no modifica el promedio', async () => {
    const { service, stockRepository, stockMovementRepository } = makeSut();
    stockRepository.findByItemAndWarehouse.mockResolvedValue(
      new StockEntity('company-1', 'item-1', 'warehouse-1', '20.000', '150.0000'),
    );

    const movement = await service.apply(
      {
        companyId: 'company-1',
        itemId: 'item-1',
        warehouseId: 'warehouse-1',
        direction: 'OUT',
        type: 'ADJUSTMENT_OUT',
        quantity: '5',
        reason: 'Rotura',
        userId: 'user-1',
        allowNegativeStock: false,
      },
      FAKE_TRANSACTION_CONTEXT,
    );

    expect(stockRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: '15.000', averageCost: '150.0000' }),
      expect.anything(),
    );
    // El costo del movimiento de salida es el promedio vigente, no un valor manual.
    expect(stockMovementRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ unitCost: '150.0000' }),
      expect.anything(),
    );
    expect(movement).toBeDefined();
  });

  it('RN-STK-06: rechaza una salida que dejaría stock negativo sin allowNegativeStock', async () => {
    const { service, stockRepository } = makeSut();
    stockRepository.findByItemAndWarehouse.mockResolvedValue(
      new StockEntity('company-1', 'item-1', 'warehouse-1', '5.000', '100.0000'),
    );

    await expect(
      service.apply(
        {
          companyId: 'company-1',
          itemId: 'item-1',
          warehouseId: 'warehouse-1',
          direction: 'OUT',
          type: 'ADJUSTMENT_OUT',
          quantity: '10',
          reason: 'Rotura',
          userId: 'user-1',
          allowNegativeStock: false,
        },
        FAKE_TRANSACTION_CONTEXT,
      ),
    ).rejects.toThrow(InsufficientStockError);
  });

  it('RN-STK-06: permite stock negativo cuando la empresa lo habilita', async () => {
    const { service, stockRepository } = makeSut();
    stockRepository.findByItemAndWarehouse.mockResolvedValue(
      new StockEntity('company-1', 'item-1', 'warehouse-1', '5.000', '100.0000'),
    );

    await service.apply(
      {
        companyId: 'company-1',
        itemId: 'item-1',
        warehouseId: 'warehouse-1',
        direction: 'OUT',
        type: 'ADJUSTMENT_OUT',
        quantity: '10',
        reason: 'Venta bajo pedido',
        userId: 'user-1',
        allowNegativeStock: true,
      },
      FAKE_TRANSACTION_CONTEXT,
    );

    expect(stockRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: '-5.000' }),
      expect.anything(),
    );
  });

  it('propaga companyId, transferGroupId y voucherId al StockMovement creado', async () => {
    const { service, stockRepository, stockMovementRepository } = makeSut();
    stockRepository.findByItemAndWarehouse.mockResolvedValue(null);

    await service.apply(
      {
        companyId: 'company-1',
        itemId: 'item-1',
        warehouseId: 'warehouse-1',
        direction: 'IN',
        type: 'PURCHASE_IN',
        quantity: '10',
        unitCost: '100',
        transferGroupId: 'group-1',
        voucherId: 'voucher-1',
        userId: 'user-1',
        allowNegativeStock: false,
      },
      FAKE_TRANSACTION_CONTEXT,
    );

    expect(stockMovementRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        transferGroupId: 'group-1',
        voucherId: 'voucher-1',
        type: 'PURCHASE_IN',
      }),
      expect.anything(),
    );
  });
});
