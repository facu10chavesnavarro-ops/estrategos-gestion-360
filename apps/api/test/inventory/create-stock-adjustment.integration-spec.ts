import { PrismaService } from '../../src/common/persistence/prisma.service';
import { PrismaUnitOfWork } from '../../src/common/infrastructure/persistence/prisma-unit-of-work';
import { PrismaWarehouseRepository } from '../../src/modules/inventory/infrastructure/persistence/prisma-warehouse.repository';
import { PrismaStockRepository } from '../../src/modules/inventory/infrastructure/persistence/prisma-stock.repository';
import { PrismaStockMovementRepository } from '../../src/modules/inventory/infrastructure/persistence/prisma-stock-movement.repository';
import { PrismaItemRepository } from '../../src/modules/catalog/infrastructure/persistence/prisma-item.repository';
import { PrismaCompanyRepository } from '../../src/modules/companies/infrastructure/persistence/prisma-company.repository';
import { PrismaAuditLogRepository } from '../../src/common/infrastructure/persistence/prisma-audit-log.repository';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { CreateStockAdjustmentUseCase } from '../../src/modules/inventory/application/use-cases/create-stock-adjustment.use-case';
import { ApplyStockMovementService } from '../../src/modules/inventory/application/services/apply-stock-movement.service';
import { resetDatabase } from '../support/reset-database';

/**
 * Prueba de integración real contra Postgres (estrategos_test): verifica que
 * CreateStockAdjustmentUseCase (Stock + StockMovement + AuditLog) hace
 * rollback completo cuando falla cualquier colaborador a mitad de la
 * transacción — sin esto, un movimiento podría quedar registrado sin que el
 * Stock materializado se haya actualizado (o viceversa).
 */
describe('CreateStockAdjustmentUseCase (integración, DB real)', () => {
  const prisma = new PrismaService();
  const warehouseRepository = new PrismaWarehouseRepository(prisma);
  const stockRepository = new PrismaStockRepository(prisma);
  const stockMovementRepository = new PrismaStockMovementRepository(prisma);
  const itemRepository = new PrismaItemRepository(prisma);
  const companyRepository = new PrismaCompanyRepository(prisma);
  const applyStockMovementService = new ApplyStockMovementService(
    stockRepository,
    stockMovementRepository,
  );
  const unitOfWork = new PrismaUnitOfWork(prisma);

  let companyId: string;
  let warehouseId: string;
  let itemId: string;
  let requestingUserId: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);

    const tenant = await prisma.tenant.create({ data: { name: 'Tenant de prueba' } });
    const company = await prisma.company.create({
      data: { tenantId: tenant.id, legalName: 'Empresa de Prueba SRL' },
    });
    companyId = company.id;

    const branch = await prisma.branch.create({
      data: { companyId, name: 'Casa Central' },
    });

    const warehouse = await prisma.warehouse.create({
      data: { companyId, branchId: branch.id, name: 'Depósito Principal' },
    });
    warehouseId = warehouse.id;

    const item = await prisma.item.create({
      data: {
        companyId,
        type: 'PRODUCT',
        sku: 'SKU-1',
        name: 'Resma A4',
        unitOfMeasure: 'unidad',
        tracksStock: true,
      },
    });
    itemId = item.id;

    const user = await prisma.user.create({
      data: {
        email: 'propietario@estrategos.test',
        passwordHash: 'irrelevante-para-este-test',
        fullName: 'Propietario de Prueba',
      },
    });
    requestingUserId = user.id;
  });

  it('camino feliz: crea Stock + StockMovement + AuditLog de forma atómica', async () => {
    const auditLogRepository = new PrismaAuditLogRepository(prisma);
    const useCase = new CreateStockAdjustmentUseCase(
      warehouseRepository,
      itemRepository,
      companyRepository,
      applyStockMovementService,
      auditLogRepository,
      unitOfWork,
    );

    const movement = await useCase.execute({
      requestingUserId,
      requestingRoleName: 'Propietario',
      companyId,
      warehouseId,
      itemId,
      direction: 'IN',
      quantity: '10',
      unitCost: '100',
    });

    const stockRows = await prisma.stock.findMany({ where: { itemId, warehouseId } });
    expect(stockRows).toHaveLength(1);
    expect(stockRows[0].quantity.toFixed(3)).toBe('10.000');
    expect(stockRows[0].averageCost.toFixed(4)).toBe('100.0000');

    const movementRows = await prisma.stockMovement.findMany({ where: { id: movement.id } });
    expect(movementRows).toHaveLength(1);

    const auditEntries = await prisma.auditLog.findMany({
      where: { action: 'stock.adjustment_in', entityId: movement.id },
    });
    expect(auditEntries).toHaveLength(1);
  });

  it('rollback: si falla la escritura de auditoría, no queda Stock ni StockMovement huérfanos', async () => {
    const failingAuditLogRepository: AuditLogRepository = {
      record: jest.fn().mockRejectedValue(new Error('fallo forzado de auditoría')),
    };
    const useCase = new CreateStockAdjustmentUseCase(
      warehouseRepository,
      itemRepository,
      companyRepository,
      applyStockMovementService,
      failingAuditLogRepository,
      unitOfWork,
    );

    await expect(
      useCase.execute({
        requestingUserId,
        requestingRoleName: 'Propietario',
        companyId,
        warehouseId,
        itemId,
        direction: 'IN',
        quantity: '10',
        unitCost: '100',
      }),
    ).rejects.toThrow('fallo forzado de auditoría');

    const stockRows = await prisma.stock.findMany({ where: { itemId, warehouseId } });
    expect(stockRows).toHaveLength(0); // ni siquiera se creó la fila de Stock

    const movementRows = await prisma.stockMovement.findMany({ where: { itemId, warehouseId } });
    expect(movementRows).toHaveLength(0);

    const auditEntries = await prisma.auditLog.findMany({
      where: { action: 'stock.adjustment_in' },
    });
    expect(auditEntries).toHaveLength(0);
  });
});
