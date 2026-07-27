import { PrismaService } from '../../src/common/persistence/prisma.service';
import { PrismaUnitOfWork } from '../../src/common/infrastructure/persistence/prisma-unit-of-work';
import { PrismaVoucherTypeRepository } from '../../src/modules/vouchers/infrastructure/persistence/prisma-voucher-type.repository';
import { PrismaPointOfSaleRepository } from '../../src/modules/vouchers/infrastructure/persistence/prisma-point-of-sale.repository';
import { PrismaVoucherCounterRepository } from '../../src/modules/vouchers/infrastructure/persistence/prisma-voucher-counter.repository';
import { PrismaVoucherRepository } from '../../src/modules/vouchers/infrastructure/persistence/prisma-voucher.repository';
import { PrismaCustomerRepository } from '../../src/modules/customers/infrastructure/persistence/prisma-customer.repository';
import { PrismaSupplierRepository } from '../../src/modules/suppliers/infrastructure/persistence/prisma-supplier.repository';
import { PrismaItemRepository } from '../../src/modules/catalog/infrastructure/persistence/prisma-item.repository';
import { PrismaTaxRepository } from '../../src/modules/catalog/infrastructure/persistence/prisma-tax.repository';
import { PrismaCompanyRepository } from '../../src/modules/companies/infrastructure/persistence/prisma-company.repository';
import { PrismaStockRepository } from '../../src/modules/inventory/infrastructure/persistence/prisma-stock.repository';
import { PrismaStockMovementRepository } from '../../src/modules/inventory/infrastructure/persistence/prisma-stock-movement.repository';
import { ApplyStockMovementService } from '../../src/modules/inventory/application/services/apply-stock-movement.service';
import {
  PrismaCustomerAccountRepository,
  PrismaCustomerAccountMovementRepository,
} from '../../src/modules/treasury/infrastructure/persistence/prisma-customer-account.repository';
import {
  PrismaSupplierAccountRepository,
  PrismaSupplierAccountMovementRepository,
} from '../../src/modules/treasury/infrastructure/persistence/prisma-supplier-account.repository';
import { ApplyCustomerAccountMovementService } from '../../src/modules/treasury/application/services/apply-customer-account-movement.service';
import { ApplySupplierAccountMovementService } from '../../src/modules/treasury/application/services/apply-supplier-account-movement.service';
import { PrismaAuditLogRepository } from '../../src/common/infrastructure/persistence/prisma-audit-log.repository';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { CreateVoucherUseCase } from '../../src/modules/vouchers/application/use-cases/create-voucher.use-case';
import { resetDatabase } from '../support/reset-database';

/**
 * Pruebas de integración reales contra Postgres (estrategos_test) para
 * CreateVoucherUseCase — el caso de uso que justifica todo el refactor de
 * ApplyStockMovementService (§0.3 de docs/sprint-3/03-comprobantes.md):
 * numera, crea Voucher+VoucherLine+VoucherLineTax y aplica el StockMovement
 * correspondiente, todo dentro de la misma transacción.
 */
describe('CreateVoucherUseCase (integración, DB real)', () => {
  const prisma = new PrismaService();
  const voucherTypeRepository = new PrismaVoucherTypeRepository(prisma);
  const pointOfSaleRepository = new PrismaPointOfSaleRepository(prisma);
  const voucherCounterRepository = new PrismaVoucherCounterRepository(prisma);
  const voucherRepository = new PrismaVoucherRepository(prisma);
  const customerRepository = new PrismaCustomerRepository(prisma);
  const supplierRepository = new PrismaSupplierRepository(prisma);
  const itemRepository = new PrismaItemRepository(prisma);
  const taxRepository = new PrismaTaxRepository(prisma);
  const companyRepository = new PrismaCompanyRepository(prisma);
  const stockRepository = new PrismaStockRepository(prisma);
  const stockMovementRepository = new PrismaStockMovementRepository(prisma);
  const applyStockMovementService = new ApplyStockMovementService(
    stockRepository,
    stockMovementRepository,
  );
  const customerAccountRepository = new PrismaCustomerAccountRepository(prisma);
  const customerAccountMovementRepository = new PrismaCustomerAccountMovementRepository(prisma);
  const supplierAccountRepository = new PrismaSupplierAccountRepository(prisma);
  const supplierAccountMovementRepository = new PrismaSupplierAccountMovementRepository(prisma);
  const applyCustomerAccountMovementService = new ApplyCustomerAccountMovementService(
    customerAccountRepository,
    customerAccountMovementRepository,
  );
  const applySupplierAccountMovementService = new ApplySupplierAccountMovementService(
    supplierAccountRepository,
    supplierAccountMovementRepository,
  );
  const unitOfWork = new PrismaUnitOfWork(prisma);

  let companyId: string;
  let branchId: string;
  let warehouseId: string;
  let itemId: string;
  let partyId: string;
  let pointOfSaleId: string;
  let voucherTypeId: string;
  let requestingUserId: string;
  let customerId: string;

  function makeUseCase(auditLogRepository: AuditLogRepository) {
    return new CreateVoucherUseCase(
      voucherTypeRepository,
      pointOfSaleRepository,
      voucherCounterRepository,
      voucherRepository,
      customerRepository,
      supplierRepository,
      itemRepository,
      taxRepository,
      companyRepository,
      applyStockMovementService,
      applyCustomerAccountMovementService,
      applySupplierAccountMovementService,
      auditLogRepository,
      unitOfWork,
    );
  }

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
    branchId = branch.id;

    const warehouse = await prisma.warehouse.create({
      data: { companyId, branchId, name: 'Depósito Principal' },
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

    // Stock inicial para poder facturar una venta sin negativo.
    await prisma.stock.create({
      data: { companyId, itemId, warehouseId, quantity: '50', averageCost: '80' },
    });

    const party = await prisma.party.create({
      data: { companyId, legalName: 'Cliente de Prueba SRL' },
    });
    partyId = party.id;
    const customer = await prisma.customer.create({ data: { partyId, companyId } });
    customerId = customer.id;

    const pointOfSale = await prisma.pointOfSale.create({
      data: { companyId, branchId, code: '0001', name: 'Casa Central' },
    });
    pointOfSaleId = pointOfSale.id;

    const voucherType = await prisma.voucherType.findUniqueOrThrow({ where: { code: 'FA_A' } });
    voucherTypeId = voucherType.id;

    const user = await prisma.user.create({
      data: {
        email: 'propietario@estrategos.test',
        passwordHash: 'irrelevante-para-este-test',
        fullName: 'Propietario de Prueba',
      },
    });
    requestingUserId = user.id;
  });

  it('camino feliz: crea Voucher + VoucherLine + StockMovement + AuditLog de forma atómica', async () => {
    const auditLogRepository = new PrismaAuditLogRepository(prisma);
    const useCase = makeUseCase(auditLogRepository);

    const voucher = await useCase.execute({
      requestingUserId,
      requestingRoleName: 'Propietario',
      companyId,
      branchId,
      pointOfSaleId,
      voucherTypeId,
      partyId,
      warehouseId,
      lines: [
        { itemId, description: 'Resma A4', quantity: '10', unitPrice: '100' },
      ],
    });

    expect(voucher.number).toBe(1);

    const voucherRows = await prisma.voucher.findMany({ where: { id: voucher.id } });
    expect(voucherRows).toHaveLength(1);
    expect(voucherRows[0].total.toFixed(2)).toBe('1000.00');

    const lineRows = await prisma.voucherLine.findMany({ where: { voucherId: voucher.id } });
    expect(lineRows).toHaveLength(1);

    const stockRow = await prisma.stock.findUnique({
      where: { itemId_warehouseId: { itemId, warehouseId } },
    });
    expect(stockRow?.quantity.toFixed(3)).toBe('40.000'); // 50 - 10

    const movementRows = await prisma.stockMovement.findMany({ where: { voucherId: voucher.id } });
    expect(movementRows).toHaveLength(1);
    expect(movementRows[0].type).toBe('SALE_OUT');

    const auditEntries = await prisma.auditLog.findMany({
      where: { action: 'voucher.create', entityId: voucher.id },
    });
    expect(auditEntries).toHaveLength(1);

    // RN-CTA-04: una Factura de Venta (affectsCurrentAccount = DEBIT) sube el saldo del cliente.
    const customerAccount = await prisma.customerAccount.findUnique({ where: { customerId } });
    expect(customerAccount?.currentBalance.toFixed(2)).toBe('1000.00');
    const accountMovements = await prisma.customerAccountMovement.findMany({
      where: { customerAccountId: customerAccount!.id },
    });
    expect(accountMovements).toHaveLength(1);
    expect(accountMovements[0].type).toBe('DEBIT');
    expect(accountMovements[0].voucherId).toBe(voucher.id);
    expect(accountMovements[0].balanceAfter.toFixed(2)).toBe('1000.00');
  });

  it('rollback: si falla la auditoría, no queda Voucher, VoucherLine, StockMovement ni cambio en Stock', async () => {
    const failingAuditLogRepository: AuditLogRepository = {
      record: jest.fn().mockRejectedValue(new Error('fallo forzado de auditoría')),
    };
    const useCase = makeUseCase(failingAuditLogRepository);

    await expect(
      useCase.execute({
        requestingUserId,
        requestingRoleName: 'Propietario',
        companyId,
        branchId,
        pointOfSaleId,
        voucherTypeId,
        partyId,
        warehouseId,
        lines: [
          { itemId, description: 'Resma A4', quantity: '10', unitPrice: '100' },
        ],
      }),
    ).rejects.toThrow('fallo forzado de auditoría');

    const voucherRows = await prisma.voucher.findMany({ where: { companyId } });
    expect(voucherRows).toHaveLength(0);

    const lineRows = await prisma.voucherLine.findMany({});
    expect(lineRows).toHaveLength(0);

    const movementRows = await prisma.stockMovement.findMany({ where: { itemId, warehouseId } });
    expect(movementRows).toHaveLength(0);

    const stockRow = await prisma.stock.findUnique({
      where: { itemId_warehouseId: { itemId, warehouseId } },
    });
    expect(stockRow?.quantity.toFixed(3)).toBe('50.000'); // sin cambios

    // El contador tampoco quedó incrementado: no hay hueco de numeración.
    const counter = await prisma.voucherCounter.findUnique({
      where: {
        companyId_pointOfSaleId_voucherTypeId: { companyId, pointOfSaleId, voucherTypeId },
      },
    });
    expect(counter).toBeNull();

    // Tampoco quedó un efecto huérfano en la cuenta corriente.
    const customerAccount = await prisma.customerAccount.findUnique({ where: { customerId } });
    expect(customerAccount).toBeNull();
  });

  it('RN-VOU-02: concurrencia de numeración — dos altas en paralelo obtienen números consecutivos sin duplicados', async () => {
    const auditLogRepository = new PrismaAuditLogRepository(prisma);
    const useCaseA = makeUseCase(auditLogRepository);
    const useCaseB = makeUseCase(auditLogRepository);

    const executeOne = () =>
      useCaseA.execute({
        requestingUserId,
        requestingRoleName: 'Propietario',
        companyId,
        branchId,
        pointOfSaleId,
        voucherTypeId,
        partyId,
        warehouseId,
        lines: [{ itemId, description: 'Resma A4', quantity: '1', unitPrice: '10' }],
      });
    const executeTwo = () =>
      useCaseB.execute({
        requestingUserId,
        requestingRoleName: 'Propietario',
        companyId,
        branchId,
        pointOfSaleId,
        voucherTypeId,
        partyId,
        warehouseId,
        lines: [{ itemId, description: 'Resma A4', quantity: '1', unitPrice: '10' }],
      });

    const [voucherA, voucherB] = await Promise.all([executeOne(), executeTwo()]);

    const numbers = [voucherA.number, voucherB.number].sort((a, b) => a - b);
    expect(numbers).toEqual([1, 2]);

    const voucherRows = await prisma.voucher.findMany({
      where: { companyId, pointOfSaleId, voucherTypeId },
    });
    expect(voucherRows).toHaveLength(2);
    expect(new Set(voucherRows.map((v) => v.number)).size).toBe(2);
  });
});
