import { PrismaClient } from '@prisma/client';
import { E2E_COMPANY_ID } from './e2e-constants';

const prisma = new PrismaClient();

/**
 * Vacía los datos de negocio de la Empresa E2E (Sprint F4,
 * docs/frontend/07-sprint-f4-stock.md §3.7) antes de correr la suite
 * Playwright completa, para que cada corrida arranque sin la basura
 * acumulada de corridas anteriores (causa real de timeouts de
 * hidratación bajo carga en la suite completa).
 *
 * Scoped estrictamente por `companyId` — nunca por coincidencia de
 * texto ("E2E" en el nombre) — para que sea imposible tocar por error
 * otra empresa. Nunca borra `Company`, `Branch`, `CompanyUser`,
 * `Tenant` ni `User`: solo las tablas de negocio que las pantallas de
 * Clientes/Proveedores (F2), Catálogo (F3) y Stock (F4) crean durante
 * los tests.
 */
async function main() {
  const company = await prisma.company.findUnique({ where: { id: E2E_COMPANY_ID } });
  if (!company) {
    // eslint-disable-next-line no-console
    console.log('[reset-e2e-company] Empresa E2E no existe todavía — corré "npm run prisma:seed" primero. Nada que borrar.');
    return;
  }

  const where = { companyId: E2E_COMPANY_ID };

  // --- Inventario (F4) ---
  await prisma.stockMovement.deleteMany({ where });
  await prisma.stock.deleteMany({ where });
  await prisma.warehouse.deleteMany({ where });

  // --- Clientes/Proveedores (F2) — cuentas corrientes antes que las cuentas ---
  const customerAccounts = await prisma.customerAccount.findMany({
    where,
    select: { id: true },
  });
  await prisma.customerAccountMovement.deleteMany({
    where: { customerAccountId: { in: customerAccounts.map((a) => a.id) } },
  });
  await prisma.customerAccount.deleteMany({ where });

  const supplierAccounts = await prisma.supplierAccount.findMany({
    where,
    select: { id: true },
  });
  await prisma.supplierAccountMovement.deleteMany({
    where: { supplierAccountId: { in: supplierAccounts.map((a) => a.id) } },
  });
  await prisma.supplierAccount.deleteMany({ where });

  await prisma.customer.deleteMany({ where });
  await prisma.supplier.deleteMany({ where });
  await prisma.party.deleteMany({ where });

  // --- Catálogo (F3) — tablas puente antes que sus dueños ---
  const priceLists = await prisma.priceList.findMany({ where, select: { id: true } });
  await prisma.priceListItem.deleteMany({
    where: { priceListId: { in: priceLists.map((p) => p.id) } },
  });
  await prisma.priceList.deleteMany({ where });

  const items = await prisma.item.findMany({ where, select: { id: true } });
  await prisma.itemTax.deleteMany({ where: { itemId: { in: items.map((i) => i.id) } } });
  await prisma.item.deleteMany({ where });

  await prisma.category.deleteMany({ where });
  await prisma.tax.deleteMany({ where });

  // eslint-disable-next-line no-console
  console.log('[reset-e2e-company] Empresa E2E vaciada — lista para una corrida limpia.');
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('[reset-e2e-company] Falló el reset:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
