import { PrismaService } from '../../src/common/persistence/prisma.service';

// No incluye "roles", "voucher_types" ni "payment_methods": son catálogos
// de referencia (sembrados una vez por el seed), no datos de test. Orden
// irrelevante: RESTART IDENTITY CASCADE resuelve las dependencias de FK
// dentro de una misma sentencia (varias de estas tablas ya se truncarían
// igual por cascada desde "companies", pero se listan explícitamente para
// que la limpieza no dependa implícitamente del grafo de FKs).
const TABLES = [
  'audit_logs',
  'refresh_tokens',
  'invitations',
  'journal_entry_lines',
  'journal_entries',
  'company_payment_method_accounts',
  'accounting_settings',
  'chart_of_accounts',
  'cash_movements',
  'cash_sessions',
  'cash_registers',
  'bank_movements',
  'bank_accounts',
  'check_details',
  'card_details',
  'payment_method_details',
  'payment_allocations',
  'payments',
  'customer_account_movements',
  'customer_accounts',
  'supplier_account_movements',
  'supplier_accounts',
  'voucher_line_taxes',
  'voucher_lines',
  'vouchers',
  'voucher_counters',
  'points_of_sale',
  'stock_movements',
  'stock',
  'warehouses',
  'price_list_items',
  'price_lists',
  'item_taxes',
  'items',
  'taxes',
  'categories',
  'suppliers',
  'customers',
  'parties',
  'company_users',
  'branches',
  'companies',
  'users',
  'tenants',
];

/** Limpia todas las tablas de datos entre tests de integración. */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE;`,
  );
}
