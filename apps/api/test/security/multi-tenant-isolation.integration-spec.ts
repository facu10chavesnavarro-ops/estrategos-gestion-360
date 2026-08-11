import { PrismaService } from '../../src/common/persistence/prisma.service';
import { PrismaWarehouseRepository } from '../../src/modules/inventory/infrastructure/persistence/prisma-warehouse.repository';
import { PrismaStockRepository } from '../../src/modules/inventory/infrastructure/persistence/prisma-stock.repository';
import { PrismaStockMovementRepository } from '../../src/modules/inventory/infrastructure/persistence/prisma-stock-movement.repository';
import { PrismaPointOfSaleRepository } from '../../src/modules/vouchers/infrastructure/persistence/prisma-point-of-sale.repository';
import { PrismaCashRegisterRepository } from '../../src/modules/treasury/infrastructure/persistence/prisma-cash-register.repository';
import { PrismaCashSessionRepository } from '../../src/modules/treasury/infrastructure/persistence/prisma-cash-session.repository';
import { PrismaCashMovementRepository } from '../../src/modules/treasury/infrastructure/persistence/prisma-cash-movement.repository';
import { resetDatabase } from '../support/reset-database';

/**
 * Prueba de integración real contra Postgres (estrategos_test) — auditoría
 * de seguridad, hallazgo A1 (IDOR / aislamiento multiempresa).
 *
 * Los 6 endpoints de listado "por id de padre" (depósitos y stock de un
 * depósito por warehouseId, puntos de venta y cajas por branchId, sesiones
 * por cashRegisterId, movimientos por cashSessionId) no filtraban por
 * `companyId` — un usuario autenticado y con membresía activa en la
 * Empresa A, conociendo (adivinando/filtrado) el id de un recurso de la
 * Empresa B, recibía los datos de la Empresa B.
 *
 * Cada bloque siembra DOS empresas reales completas (A y B) con un
 * recurso propio cada una, y prueba contra la base real — no un mock —
 * que:
 *   1. Empresa A consultando con el id del recurso de Empresa B → [].
 *   2. Empresa A consultando con su propio id → el recurso real.
 *   3. Un id inexistente → [] (misma respuesta que el caso 1: no se
 *      filtra si el recurso "no existe" o "es de otra empresa").
 */
// El beforeEach siembra DOS empresas completas (branch, warehouse, item,
// stock, punto de venta, caja, sesión, movimiento) — más round-trips a
// Postgres que el resto de los specs de integración, que solo siembran
// una empresa. Supera el timeout por defecto de Jest (5s) en la mayoría
// de las corridas.
jest.setTimeout(30_000);

describe('Aislamiento multiempresa — listados por id de padre (A1, DB real)', () => {
  const prisma = new PrismaService();
  const warehouseRepository = new PrismaWarehouseRepository(prisma);
  const stockRepository = new PrismaStockRepository(prisma);
  const stockMovementRepository = new PrismaStockMovementRepository(prisma);
  const pointOfSaleRepository = new PrismaPointOfSaleRepository(prisma);
  const cashRegisterRepository = new PrismaCashRegisterRepository(prisma);
  const cashSessionRepository = new PrismaCashSessionRepository(prisma);
  const cashMovementRepository = new PrismaCashMovementRepository(prisma);

  let companyA: string;
  let companyB: string;
  let branchA: string;
  let branchB: string;
  let warehouseA: { id: string };
  let warehouseB: { id: string };
  let itemA: { id: string };
  let posA: { id: string };
  let posB: { id: string };
  let cashRegisterA: { id: string };
  let cashRegisterB: { id: string };
  let cashSessionA: { id: string };
  let cashSessionB: { id: string };
  let userA: { id: string };

  const NONEXISTENT_ID = '00000000-0000-0000-0000-000000000000';

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);

    const tenant = await prisma.tenant.create({ data: { name: 'Tenant de prueba' } });

    const cA = await prisma.company.create({
      data: { tenantId: tenant.id, legalName: 'Empresa A SRL' },
    });
    companyA = cA.id;
    const cB = await prisma.company.create({
      data: { tenantId: tenant.id, legalName: 'Empresa B SRL' },
    });
    companyB = cB.id;

    const bA = await prisma.branch.create({ data: { companyId: companyA, name: 'Casa Central A' } });
    branchA = bA.id;
    const bB = await prisma.branch.create({ data: { companyId: companyB, name: 'Casa Central B' } });
    branchB = bB.id;

    warehouseA = await prisma.warehouse.create({
      data: { companyId: companyA, branchId: branchA, name: 'Depósito A' },
    });
    warehouseB = await prisma.warehouse.create({
      data: { companyId: companyB, branchId: branchB, name: 'Depósito B' },
    });

    itemA = await prisma.item.create({
      data: {
        companyId: companyA,
        type: 'PRODUCT',
        sku: 'SKU-A',
        name: 'Producto de Empresa A',
        unitOfMeasure: 'unidad',
        tracksStock: true,
      },
    });
    await prisma.stock.create({
      data: {
        companyId: companyA,
        itemId: itemA.id,
        warehouseId: warehouseA.id,
        quantity: '10',
        averageCost: '100',
      },
    });
    await prisma.stockMovement.create({
      data: {
        id: 'a1-stock-movement-0000000000000001',
        companyId: companyA,
        itemId: itemA.id,
        warehouseId: warehouseA.id,
        type: 'ADJUSTMENT_IN',
        quantity: '10',
        unitCost: '100',
        userId: (
          await prisma.user.create({
            data: {
              email: 'sistema-a@estrategos.test',
              passwordHash: 'irrelevante',
              fullName: 'Sistema A',
            },
          })
        ).id,
      },
    });

    posA = await prisma.pointOfSale.create({
      data: { companyId: companyA, branchId: branchA, code: '0001', name: 'PV A' },
    });
    posB = await prisma.pointOfSale.create({
      data: { companyId: companyB, branchId: branchB, code: '0001', name: 'PV B' },
    });

    cashRegisterA = await prisma.cashRegister.create({
      data: { companyId: companyA, branchId: branchA, name: 'Caja A' },
    });
    cashRegisterB = await prisma.cashRegister.create({
      data: { companyId: companyB, branchId: branchB, name: 'Caja B' },
    });

    userA = await prisma.user.create({
      data: { email: 'propietario-a@estrategos.test', passwordHash: 'irrelevante', fullName: 'Propietario A' },
    });
    const userB = await prisma.user.create({
      data: { email: 'propietario-b@estrategos.test', passwordHash: 'irrelevante', fullName: 'Propietario B' },
    });

    cashSessionA = await prisma.cashSession.create({
      data: { cashRegisterId: cashRegisterA.id, openedByUserId: userA.id, openingBalance: '100' },
    });
    cashSessionB = await prisma.cashSession.create({
      data: { cashRegisterId: cashRegisterB.id, openedByUserId: userB.id, openingBalance: '100' },
    });

    await prisma.cashMovement.create({
      data: {
        id: 'a1-cash-movement-00000000000000001',
        cashSessionId: cashSessionA.id,
        type: 'IN',
        amount: '50',
        reason: 'Aporte Empresa A',
      },
    });
    await prisma.cashMovement.create({
      data: {
        id: 'a1-cash-movement-00000000000000002',
        cashSessionId: cashSessionB.id,
        type: 'IN',
        amount: '999',
        reason: 'Aporte Empresa B — no debe filtrarse a la Empresa A',
      },
    });
  });

  it('Depósitos: Empresa A no ve los depósitos de la sucursal de Empresa B, sí los propios, e ids inexistentes no filtran nada', async () => {
    await expect(warehouseRepository.findAllByBranch(branchB, companyA)).resolves.toEqual([]);

    const ownResult = await warehouseRepository.findAllByBranch(branchA, companyA);
    expect(ownResult).toHaveLength(1);
    expect(ownResult[0].id).toBe(warehouseA.id);
    expect(ownResult.some((w) => w.name === 'Depósito B')).toBe(false);

    await expect(
      warehouseRepository.findAllByBranch(NONEXISTENT_ID, companyA),
    ).resolves.toEqual([]);
  });

  it('Stock: Empresa A no ve el stock del depósito de Empresa B, sí el propio, e ids inexistentes no filtran nada', async () => {
    await expect(
      stockRepository.findAllByWarehouse(warehouseB.id, companyA, {}),
    ).resolves.toEqual([]);

    const ownResult = await stockRepository.findAllByWarehouse(warehouseA.id, companyA, {});
    expect(ownResult).toHaveLength(1);
    expect(ownResult[0].itemId).toBe(itemA.id);

    await expect(
      stockRepository.findAllByWarehouse(NONEXISTENT_ID, companyA, {}),
    ).resolves.toEqual([]);
  });

  it('Movimientos de stock: Empresa A no ve los movimientos del depósito de Empresa B', async () => {
    await expect(
      stockMovementRepository.findAllByWarehouse(warehouseB.id, companyA, {}),
    ).resolves.toEqual([]);

    const ownResult = await stockMovementRepository.findAllByWarehouse(warehouseA.id, companyA, {});
    expect(ownResult).toHaveLength(1);
    expect(ownResult[0].warehouseId).toBe(warehouseA.id);
  });

  it('Puntos de venta: Empresa A no ve los puntos de venta de la sucursal de Empresa B, sí los propios', async () => {
    await expect(pointOfSaleRepository.findAllByBranch(branchB, companyA)).resolves.toEqual([]);

    const ownResult = await pointOfSaleRepository.findAllByBranch(branchA, companyA);
    expect(ownResult).toHaveLength(1);
    expect(ownResult[0].id).toBe(posA.id);
    expect(ownResult.some((p) => p.name === 'PV B')).toBe(false);

    await expect(
      pointOfSaleRepository.findAllByBranch(NONEXISTENT_ID, companyA),
    ).resolves.toEqual([]);
    // El id existe, pero pertenece a otra sucursal/empresa — verificación cruzada extra.
    expect(posB.id).not.toBe(posA.id);
  });

  it('Cajas: Empresa A no ve las cajas de la sucursal de Empresa B, sí las propias', async () => {
    await expect(cashRegisterRepository.findAllByBranch(branchB, companyA)).resolves.toEqual([]);

    const ownResult = await cashRegisterRepository.findAllByBranch(branchA, companyA);
    expect(ownResult).toHaveLength(1);
    expect(ownResult[0].id).toBe(cashRegisterA.id);
    expect(ownResult.some((r) => r.name === 'Caja B')).toBe(false);

    await expect(
      cashRegisterRepository.findAllByBranch(NONEXISTENT_ID, companyA),
    ).resolves.toEqual([]);
  });

  it('Sesiones de caja: Empresa A no ve las sesiones de la caja de Empresa B, sí las propias', async () => {
    await expect(
      cashSessionRepository.findAllByCashRegister(cashRegisterB.id, companyA),
    ).resolves.toEqual([]);

    const ownResult = await cashSessionRepository.findAllByCashRegister(cashRegisterA.id, companyA);
    expect(ownResult).toHaveLength(1);
    expect(ownResult[0].id).toBe(cashSessionA.id);
    expect(ownResult[0].openedByUserId).toBe(userA.id);

    await expect(
      cashSessionRepository.findAllByCashRegister(NONEXISTENT_ID, companyA),
    ).resolves.toEqual([]);
  });

  it('Movimientos de caja: Empresa A no ve los movimientos de la sesión de Empresa B (ni el monto ni el motivo), sí los propios', async () => {
    await expect(
      cashMovementRepository.findAllBySession(cashSessionB.id, companyA),
    ).resolves.toEqual([]);

    const ownResult = await cashMovementRepository.findAllBySession(cashSessionA.id, companyA);
    expect(ownResult).toHaveLength(1);
    expect(ownResult[0].amount).toBe('50');
    expect(ownResult[0].reason).toBe('Aporte Empresa A');
    // Verificación explícita de no filtración: ningún monto/motivo de la
    // Empresa B aparece en la respuesta de la Empresa A.
    expect(JSON.stringify(ownResult)).not.toContain('999');
    expect(JSON.stringify(ownResult)).not.toContain('Empresa B');

    await expect(
      cashMovementRepository.findAllBySession(NONEXISTENT_ID, companyA),
    ).resolves.toEqual([]);
  });

  it('Simetría: Empresa B tampoco ve ningún recurso de Empresa A (control cruzado en ambos sentidos)', async () => {
    await expect(warehouseRepository.findAllByBranch(branchA, companyB)).resolves.toEqual([]);
    await expect(pointOfSaleRepository.findAllByBranch(branchA, companyB)).resolves.toEqual([]);
    await expect(cashRegisterRepository.findAllByBranch(branchA, companyB)).resolves.toEqual([]);
    await expect(
      cashSessionRepository.findAllByCashRegister(cashRegisterA.id, companyB),
    ).resolves.toEqual([]);
    await expect(
      cashMovementRepository.findAllBySession(cashSessionA.id, companyB),
    ).resolves.toEqual([]);
    await expect(
      stockRepository.findAllByWarehouse(warehouseA.id, companyB, {}),
    ).resolves.toEqual([]);
  });
});
