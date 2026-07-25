import { PrismaService } from '../../src/common/persistence/prisma.service';
import { PrismaUnitOfWork } from '../../src/common/infrastructure/persistence/prisma-unit-of-work';
import { PrismaWarehouseRepository } from '../../src/modules/inventory/infrastructure/persistence/prisma-warehouse.repository';
import { PrismaStockRepository } from '../../src/modules/inventory/infrastructure/persistence/prisma-stock.repository';
import { PrismaStockMovementRepository } from '../../src/modules/inventory/infrastructure/persistence/prisma-stock-movement.repository';
import { PrismaItemRepository } from '../../src/modules/catalog/infrastructure/persistence/prisma-item.repository';
import { PrismaCompanyRepository } from '../../src/modules/companies/infrastructure/persistence/prisma-company.repository';
import { PrismaAuditLogRepository } from '../../src/common/infrastructure/persistence/prisma-audit-log.repository';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { CreateStockTransferUseCase } from '../../src/modules/inventory/application/use-cases/create-stock-transfer.use-case';
import { resetDatabase } from '../support/reset-database';

/**
 * Prueba de integración real contra Postgres (estrategos_test): verifica que
 * CreateStockTransferUseCase (2 StockMovement + 2 Stock + 1 AuditLog) hace
 * rollback completo cuando falla a mitad de camino — sin esto, el depósito
 * de origen podría quedar con el stock ya descontado sin que el destino
 * llegara a recibirlo (o sin que quedara registrado ningún movimiento).
 */
describe('CreateStockTransferUseCase (integración, DB real)', () => {
  const prisma = new PrismaService();
  const warehouseRepository = new PrismaWarehouseRepository(prisma);
  const stockRepository = new PrismaStockRepository(prisma);
  const stockMovementRepository = new PrismaStockMovementRepository(prisma);
  const itemRepository = new PrismaItemRepository(prisma);
  const companyRepository = new PrismaCompanyRepository(prisma);
  const unitOfWork = new PrismaUnitOfWork(prisma);

  let companyId: string;
  let fromWarehouseId: string;
  let toWarehouseId: string;
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

    const fromWarehouse = await prisma.warehouse.create({
      data: { companyId, branchId: branch.id, name: 'Depósito Origen' },
    });
    fromWarehouseId = fromWarehouse.id;

    const toWarehouse = await prisma.warehouse.create({
      data: { companyId, branchId: branch.id, name: 'Depósito Destino' },
    });
    toWarehouseId = toWarehouse.id;

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

    // Stock inicial en el depósito de origen.
    await prisma.stock.create({
      data: { companyId, itemId, warehouseId: fromWarehouseId, quantity: '20', averageCost: '100' },
    });

    const user = await prisma.user.create({
      data: {
        email: 'propietario@estrategos.test',
        passwordHash: 'irrelevante-para-este-test',
        fullName: 'Propietario de Prueba',
      },
    });
    requestingUserId = user.id;
  });

  it('camino feliz: mueve stock entre depósitos con un par de movimientos atómico', async () => {
    const auditLogRepository = new PrismaAuditLogRepository(prisma);
    const useCase = new CreateStockTransferUseCase(
      warehouseRepository,
      stockRepository,
      stockMovementRepository,
      itemRepository,
      companyRepository,
      auditLogRepository,
      unitOfWork,
    );

    const result = await useCase.execute({
      requestingUserId,
      requestingRoleName: 'Propietario',
      companyId,
      fromWarehouseId,
      toWarehouseId,
      itemId,
      quantity: '5',
      reason: 'Reposición',
    });

    const fromStock = await prisma.stock.findUnique({
      where: { itemId_warehouseId: { itemId, warehouseId: fromWarehouseId } },
    });
    expect(fromStock?.quantity.toFixed(3)).toBe('15.000');

    const toStock = await prisma.stock.findUnique({
      where: { itemId_warehouseId: { itemId, warehouseId: toWarehouseId } },
    });
    expect(toStock?.quantity.toFixed(3)).toBe('5.000');
    expect(toStock?.averageCost.toFixed(4)).toBe('100.0000');

    const movements = await prisma.stockMovement.findMany({
      where: { transferGroupId: result.outMovement.transferGroupId as string },
    });
    expect(movements).toHaveLength(2);

    const auditEntries = await prisma.auditLog.findMany({ where: { action: 'stock.transfer' } });
    expect(auditEntries).toHaveLength(1);
  });

  it('rollback: si falla la auditoría, el origen no queda descontado ni se crea ningún movimiento', async () => {
    const failingAuditLogRepository: AuditLogRepository = {
      record: jest.fn().mockRejectedValue(new Error('fallo forzado de auditoría')),
    };
    const useCase = new CreateStockTransferUseCase(
      warehouseRepository,
      stockRepository,
      stockMovementRepository,
      itemRepository,
      companyRepository,
      failingAuditLogRepository,
      unitOfWork,
    );

    await expect(
      useCase.execute({
        requestingUserId,
        requestingRoleName: 'Propietario',
        companyId,
        fromWarehouseId,
        toWarehouseId,
        itemId,
        quantity: '5',
        reason: 'Reposición',
      }),
    ).rejects.toThrow('fallo forzado de auditoría');

    const fromStock = await prisma.stock.findUnique({
      where: { itemId_warehouseId: { itemId, warehouseId: fromWarehouseId } },
    });
    expect(fromStock?.quantity.toFixed(3)).toBe('20.000'); // sin cambios — no quedó a medio descontar

    const toStock = await prisma.stock.findUnique({
      where: { itemId_warehouseId: { itemId, warehouseId: toWarehouseId } },
    });
    expect(toStock).toBeNull(); // el destino nunca llegó a crearse

    const movements = await prisma.stockMovement.findMany({ where: { itemId } });
    expect(movements).toHaveLength(0); // ninguno de los dos movimientos quedó registrado

    const auditEntries = await prisma.auditLog.findMany({ where: { action: 'stock.transfer' } });
    expect(auditEntries).toHaveLength(0);
  });
});
