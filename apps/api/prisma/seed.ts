import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { E2E_COMPANY_ID, E2E_BRANCH_ID } from './e2e-constants';

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

/**
 * Catálogo global de VoucherType (Sprint 3.3, docs/sprint-3/03-comprobantes.md
 * §0.1) — alcance recortado: solo Factura/Nota de Crédito de Venta y Factura
 * de Compra. Recibo, Remito, Nota de Débito, Orden de Compra y Presupuesto
 * quedan diferidos.
 */
const VOUCHER_TYPES = [
  {
    code: 'FA_A',
    name: 'Factura A',
    flow: 'SALE' as const,
    affectsStock: 'OUT' as const,
    affectsCurrentAccount: 'DEBIT' as const,
    requiresCae: true,
    isCreditNote: false,
    relatedVoucherRequired: false,
  },
  {
    code: 'FA_B',
    name: 'Factura B',
    flow: 'SALE' as const,
    affectsStock: 'OUT' as const,
    affectsCurrentAccount: 'DEBIT' as const,
    requiresCae: true,
    isCreditNote: false,
    relatedVoucherRequired: false,
  },
  {
    code: 'FA_C',
    name: 'Factura C',
    flow: 'SALE' as const,
    affectsStock: 'OUT' as const,
    affectsCurrentAccount: 'DEBIT' as const,
    requiresCae: true,
    isCreditNote: false,
    relatedVoucherRequired: false,
  },
  {
    code: 'NC_A',
    name: 'Nota de Crédito A',
    flow: 'SALE' as const,
    affectsStock: 'IN' as const,
    affectsCurrentAccount: 'CREDIT' as const,
    requiresCae: true,
    isCreditNote: true,
    relatedVoucherRequired: true,
  },
  {
    code: 'NC_B',
    name: 'Nota de Crédito B',
    flow: 'SALE' as const,
    affectsStock: 'IN' as const,
    affectsCurrentAccount: 'CREDIT' as const,
    requiresCae: true,
    isCreditNote: true,
    relatedVoucherRequired: true,
  },
  {
    code: 'NC_C',
    name: 'Nota de Crédito C',
    flow: 'SALE' as const,
    affectsStock: 'IN' as const,
    affectsCurrentAccount: 'CREDIT' as const,
    requiresCae: true,
    isCreditNote: true,
    relatedVoucherRequired: true,
  },
  {
    code: 'FC',
    name: 'Factura de Compra',
    flow: 'PURCHASE' as const,
    affectsStock: 'IN' as const,
    affectsCurrentAccount: 'CREDIT' as const,
    requiresCae: false,
    isCreditNote: false,
    relatedVoucherRequired: false,
  },
];

/**
 * Catálogo global de PaymentMethod (Sprint 3.4, docs/sprint-3/04-tesoreria.md
 * §0.5/§1.1) — Efectivo/Transferencia/Cuenta Corriente sin tabla de detalle;
 * Cheque y las dos tarjetas sí (CheckDetail/CardDetail).
 */
const PAYMENT_METHODS = [
  {
    code: 'EFECTIVO',
    name: 'Efectivo',
    requiresCheckDetail: false,
    requiresCardDetail: false,
    requiresCashMovement: true,
    requiresBankMovement: false,
  },
  {
    code: 'CHEQUE',
    name: 'Cheque',
    requiresCheckDetail: true,
    requiresCardDetail: false,
    requiresCashMovement: false,
    requiresBankMovement: false,
  },
  {
    code: 'TRANSFERENCIA',
    name: 'Transferencia Bancaria',
    requiresCheckDetail: false,
    requiresCardDetail: false,
    requiresCashMovement: false,
    requiresBankMovement: true,
  },
  {
    code: 'TARJETA_DEBITO',
    name: 'Tarjeta de Débito',
    requiresCheckDetail: false,
    requiresCardDetail: true,
    requiresCashMovement: false,
    requiresBankMovement: true,
  },
  {
    code: 'TARJETA_CREDITO',
    name: 'Tarjeta de Crédito',
    requiresCheckDetail: false,
    requiresCardDetail: true,
    requiresCashMovement: false,
    requiresBankMovement: true,
  },
  {
    code: 'CUENTA_CORRIENTE',
    name: 'Cuenta Corriente',
    requiresCheckDetail: false,
    requiresCardDetail: false,
    requiresCashMovement: false,
    requiresBankMovement: false,
  },
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

  // Empresa dedicada a la suite E2E (Sprint F4, docs/frontend/07-sprint-f4-stock.md
  // §3.7): id fijo para que reset-e2e-company.ts pueda apuntarle sin buscarla.
  // Nunca la usa un usuario real ni una corrida manual — solo Playwright.
  const e2eCompany = await prisma.company.upsert({
    where: { id: E2E_COMPANY_ID },
    update: {},
    create: {
      id: E2E_COMPANY_ID,
      tenantId: tenant.id,
      legalName: 'Empresa E2E',
      taxId: '30-00000000-1',
    },
  });

  await prisma.branch.upsert({
    where: { id: E2E_BRANCH_ID },
    update: {},
    create: {
      id: E2E_BRANCH_ID,
      companyId: e2eCompany.id,
      name: 'Sucursal E2E',
    },
  });

  await prisma.companyUser.upsert({
    where: {
      userId_companyId: { userId: adminUser.id, companyId: e2eCompany.id },
    },
    update: {},
    create: {
      userId: adminUser.id,
      companyId: e2eCompany.id,
      roleId: adminRole!.id,
    },
  });

  await Promise.all(
    VOUCHER_TYPES.map((voucherType) =>
      prisma.voucherType.upsert({
        where: { code: voucherType.code },
        update: {},
        create: voucherType,
      }),
    ),
  );

  await Promise.all(
    PAYMENT_METHODS.map((paymentMethod) =>
      prisma.paymentMethod.upsert({
        where: { code: paymentMethod.code },
        update: {},
        create: paymentMethod,
      }),
    ),
  );

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
