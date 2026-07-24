const path = require('path');
const dotenv = require('dotenv');

// Se ejecuta como setupFiles de Jest, antes de que cualquier test importe
// PrismaService — así el DATABASE_URL apunta a estrategos_test (nunca a
// estrategos_dev) desde el primer `new PrismaClient()`.
dotenv.config({
  path: path.resolve(__dirname, '../../.env.test'),
  override: true,
});

if (!process.env.DATABASE_URL?.includes('estrategos_test')) {
  throw new Error(
    'Los tests de integración requieren DATABASE_URL apuntando a estrategos_test ' +
      '(revisar apps/api/.env.test) — se aborta para no correr TRUNCATE sobre otra base.',
  );
}
