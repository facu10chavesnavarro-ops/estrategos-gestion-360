import { PrismaService } from '../../src/common/persistence/prisma.service';

// No incluye "roles": es catálogo de referencia (sembrado una vez por el
// seed), no dato de test. Orden irrelevante: RESTART IDENTITY CASCADE
// resuelve las dependencias de FK dentro de una misma sentencia.
const TABLES = [
  'audit_logs',
  'refresh_tokens',
  'invitations',
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
