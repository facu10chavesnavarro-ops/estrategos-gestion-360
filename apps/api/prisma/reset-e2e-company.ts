import { PrismaClient } from '@prisma/client';
import { E2E_COMPANY_ID } from './e2e-constants';

const prisma = new PrismaClient();

/**
 * Vacía los datos de negocio de la Empresa E2E (Sprint F4,
 * docs/frontend/07-sprint-f4-stock.md §3.7; extendido en Sprint F5,
 * docs/frontend/08-sprint-f5-comprobantes.md §3.8; extendido en Sprint F6,
 * docs/frontend/09-sprint-f6-tesoreria.md §8) antes de correr la suite
 * Playwright completa, para que cada corrida arranque sin la basura
 * acumulada de corridas anteriores (causa real de timeouts de
 * hidratación bajo carga en la suite completa).
 *
 * Scoped estrictamente por `companyId` — nunca por coincidencia de
 * texto ("E2E" en el nombre) — para que sea imposible tocar por error
 * otra empresa. Nunca borra `Company`, `Branch`, `CompanyUser`,
 * `Tenant` ni `User`: solo las tablas de negocio que las pantallas de
 * Clientes/Proveedores (F2), Catálogo (F3), Stock (F4), Comprobantes
 * (F5) y Tesorería (F6) crean durante los tests. `CashRegister` y
 * `BankAccount` también se borran (son gestionados a nivel Empresa, no
 * solo sus movimientos) para que cada corrida los recree limpios.
 * `AccountingSettings`/`JournalEntry` quedan fuera: la suite E2E no
 * activa Contabilidad todavía.
 */
async function main() {
  const company = await prisma.company.findUnique({ where: { id: E2E_COMPANY_ID } });
  if (!company) {
    // eslint-disable-next-line no-console
    console.log('[reset-e2e-company] Empresa E2E no existe todavía — corré "npm run prisma:seed" primero. Nada que borrar.');
    return;
  }

  const where = { companyId: E2E_COMPANY_ID };

  // --- Tesorería (F6) — primero de todo: PaymentAllocation referencia
  // voucherId con ON DELETE RESTRICT, así que Payment y sus dependientes
  // deben quedar borrados antes de tocar la sección de Comprobantes más
  // abajo. CashMovement/BankMovement.paymentId son ON DELETE SET NULL,
  // así que Payment puede borrarse sin tocar antes sus movimientos.
  const payments = await prisma.payment.findMany({ where, select: { id: true } });
  const paymentIds = payments.map((p) => p.id);

  await prisma.paymentAllocation.deleteMany({ where: { paymentId: { in: paymentIds } } });

  const methodDetails = await prisma.paymentMethodDetail.findMany({
    where: { paymentId: { in: paymentIds } },
    select: { checkDetailId: true, cardDetailId: true },
  });
  await prisma.paymentMethodDetail.deleteMany({ where: { paymentId: { in: paymentIds } } });
  await prisma.checkDetail.deleteMany({
    where: {
      id: { in: methodDetails.map((m) => m.checkDetailId).filter((id): id is string => id !== null) },
    },
  });
  await prisma.cardDetail.deleteMany({
    where: {
      id: { in: methodDetails.map((m) => m.cardDetailId).filter((id): id is string => id !== null) },
    },
  });

  await prisma.payment.deleteMany({ where });

  // --- Caja y Bancos (3.5/F6) — sesiones/movimientos propios de la
  // Empresa E2E, scoped a través de CashRegister/BankAccount (que sí
  // tienen companyId). CashMovement.cashSessionId y
  // CashSession.cashRegisterId son ON DELETE RESTRICT: hay que vaciar de
  // adentro hacia afuera.
  const cashRegisters = await prisma.cashRegister.findMany({ where, select: { id: true } });
  const cashRegisterIds = cashRegisters.map((r) => r.id);
  const cashSessions = await prisma.cashSession.findMany({
    where: { cashRegisterId: { in: cashRegisterIds } },
    select: { id: true },
  });
  await prisma.cashMovement.deleteMany({
    where: { cashSessionId: { in: cashSessions.map((s) => s.id) } },
  });
  await prisma.cashSession.deleteMany({ where: { cashRegisterId: { in: cashRegisterIds } } });
  await prisma.cashRegister.deleteMany({ where });

  const bankAccounts = await prisma.bankAccount.findMany({ where, select: { id: true } });
  await prisma.bankMovement.deleteMany({
    where: { bankAccountId: { in: bankAccounts.map((a) => a.id) } },
  });
  await prisma.bankAccount.deleteMany({ where });

  // --- Comprobantes (F5) — Voucher referencia warehouseId/partyId/itemId
  // de las tablas que se borran más abajo. Se anula relatedVoucherId
  // (autorreferencia Voucher→Voucher) antes de borrar para no violar la
  // FK. VoucherType y PaymentMethod son catálogos globales de plataforma
  // (como Role) y nunca se tocan: no tienen companyId.
  const vouchers = await prisma.voucher.findMany({ where, select: { id: true } });
  const voucherIds = vouchers.map((v) => v.id);
  await prisma.voucher.updateMany({ where, data: { relatedVoucherId: null } });
  const voucherLines = await prisma.voucherLine.findMany({
    where: { voucherId: { in: voucherIds } },
    select: { id: true },
  });
  await prisma.voucherLineTax.deleteMany({
    where: { voucherLineId: { in: voucherLines.map((l) => l.id) } },
  });
  await prisma.voucherLine.deleteMany({ where: { voucherId: { in: voucherIds } } });
  await prisma.voucher.deleteMany({ where });
  await prisma.voucherCounter.deleteMany({ where });
  await prisma.pointOfSale.deleteMany({ where });

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
