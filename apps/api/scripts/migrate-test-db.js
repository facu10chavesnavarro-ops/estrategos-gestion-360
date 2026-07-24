const path = require('path');
const { spawnSync } = require('child_process');

require('dotenv').config({
  path: path.resolve(__dirname, '../.env.test'),
  override: true,
});

if (!process.env.DATABASE_URL?.includes('estrategos_test')) {
  console.error(
    'DATABASE_URL no apunta a estrategos_test (revisar apps/api/.env.test) — abortando.',
  );
  process.exit(1);
}

const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
