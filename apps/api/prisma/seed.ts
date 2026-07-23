import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const BASE_ROLES = [
  'Superadministrador',
  'Administrador Estrategos',
  'Consultor',
  'Propietario',
  'Administrador de empresa',
  'Contador externo',
  'Empleado',
  'Auditor',
];

async function main() {
  const roles = await Promise.all(
    BASE_ROLES.map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  const tenant = await prisma.tenant.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Estrategos Consultora',
    },
  });

  const pilotCompany = await prisma.company.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      tenantId: tenant.id,
      legalName: 'Empresa Piloto SRL',
      taxId: '30-00000000-0',
    },
  });

  const passwordHash = await argon2.hash('CambiarEsta123!', {
    type: argon2.argon2id,
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@estrategos.local' },
    update: {},
    create: {
      email: 'admin@estrategos.local',
      passwordHash,
      fullName: 'Administrador de Prueba',
    },
  });

  const adminRole = roles.find((r) => r.name === 'Administrador de empresa');
  await prisma.companyUser.upsert({
    where: {
      userId_companyId: { userId: adminUser.id, companyId: pilotCompany.id },
    },
    update: {},
    create: {
      userId: adminUser.id,
      companyId: pilotCompany.id,
      roleId: adminRole!.id,
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed completo. Usuario de prueba: admin@estrategos.local / CambiarEsta123!');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
