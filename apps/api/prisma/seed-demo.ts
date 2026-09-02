import { PrismaClient } from '@prisma/client';
import { uuidv7 } from '../src/common/infrastructure/id/uuid-v7';

const prisma = new PrismaClient();

const PILOT_COMPANY_ID = '00000000-0000-0000-0000-000000000002';

/**
 * Seed de datos de PRUEBA/DEMO — separado a propósito de prisma/seed.ts.
 *
 * seed.ts es infraestructura mínima segura de correr en cualquier entorno
 * (roles, catálogos globales, un usuario admin) — este script agrega datos
 * de NEGOCIO (clientes, proveedores, productos, comprobantes) sobre la
 * "Empresa Piloto SRL" que seed.ts ya crea, pensados solo para que alguien
 * pueda entrar a un staging/demo y ver algo con contenido real sin arrancar
 * de cero. No correr en producción real con datos de clientes de verdad.
 *
 * Requiere que `npm run prisma:seed` ya se haya corrido antes (tenant,
 * Empresa Piloto, usuario admin, VoucherType/PaymentMethod). Es idempotente:
 * si ya hay comprobantes en la empresa piloto, no crea nada de vuelta.
 *
 * Uso:
 *   npm run prisma:seed:demo --workspace=@estrategos/api
 */
async function main() {
  const company = await prisma.company.findUnique({ where: { id: PILOT_COMPANY_ID } });
  if (!company) {
    throw new Error(
      'No existe la Empresa Piloto — corré primero "npm run prisma:seed --workspace=@estrategos/api".',
    );
  }

  const existingVoucher = await prisma.voucher.findFirst({ where: { companyId: company.id } });
  if (existingVoucher) {
    // eslint-disable-next-line no-console
    console.log('Seed de demo: ya hay comprobantes en la Empresa Piloto, no se crea nada de nuevo.');
    return;
  }

  const adminUser = await prisma.user.findUniqueOrThrow({
    where: { email: 'admin@estrategos.local' },
  });

  const branch = await prisma.branch.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      companyId: company.id,
      name: 'Casa Central',
      address: 'Av. Siempre Viva 742',
    },
  });

  const warehouse = await prisma.warehouse.upsert({
    where: { id: '00000000-0000-0000-0000-000000000011' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      companyId: company.id,
      branchId: branch.id,
      name: 'Depósito Central',
    },
  });

  const pointOfSale = await prisma.pointOfSale.upsert({
    where: { companyId_code: { companyId: company.id, code: '0001' } },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000012',
      companyId: company.id,
      branchId: branch.id,
      code: '0001',
      name: 'Mostrador',
    },
  });

  const category = await prisma.category.upsert({
    where: { id: '00000000-0000-0000-0000-000000000020' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000020',
      companyId: company.id,
      name: 'Insumos de oficina',
    },
  });

  const items = await Promise.all(
    [
      { id: '00000000-0000-0000-0000-000000000030', sku: 'RES-001', name: 'Resma de papel A4', type: 'PRODUCT' as const, costPrice: '1200.00', unitOfMeasure: 'unidad' },
      { id: '00000000-0000-0000-0000-000000000031', sku: 'LAP-001', name: 'Lapicera azul', type: 'PRODUCT' as const, costPrice: '150.00', unitOfMeasure: 'unidad' },
      { id: '00000000-0000-0000-0000-000000000032', sku: 'SRV-CONS', name: 'Consultoría por hora', type: 'SERVICE' as const, costPrice: null, unitOfMeasure: 'hora' },
    ].map((i) =>
      prisma.item.upsert({
        where: { id: i.id },
        update: {},
        create: {
          id: i.id,
          companyId: company.id,
          type: i.type,
          sku: i.sku,
          name: i.name,
          categoryId: i.type === 'PRODUCT' ? category.id : null,
          unitOfMeasure: i.unitOfMeasure,
          tracksStock: i.type === 'PRODUCT',
          costPrice: i.costPrice,
        },
      }),
    ),
  );

  const customers = await Promise.all(
    [
      { id: '00000000-0000-0000-0000-000000000040', legalName: 'Comercial del Norte SA', taxId: '30-11111111-1' },
      { id: '00000000-0000-0000-0000-000000000041', legalName: 'Distribuidora Sur SRL', taxId: '30-22222222-2' },
      { id: '00000000-0000-0000-0000-000000000042', legalName: 'Juan Pérez (Consumidor Final)', taxId: null },
    ].map(async (c) => {
      const party = await prisma.party.upsert({
        where: { id: c.id },
        update: {},
        create: {
          id: c.id,
          companyId: company.id,
          legalName: c.legalName,
          taxId: c.taxId,
          taxCondition: c.taxId ? 'Responsable Inscripto' : 'Consumidor Final',
        },
      });
      return prisma.customer.upsert({
        where: { partyId: party.id },
        update: {},
        create: { partyId: party.id, companyId: company.id },
      });
    }),
  );

  const supplierParty = await prisma.party.upsert({
    where: { id: '00000000-0000-0000-0000-000000000050' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000050',
      companyId: company.id,
      legalName: 'Papelera Mayorista SA',
      taxId: '30-33333333-3',
      taxCondition: 'Responsable Inscripto',
    },
  });
  await prisma.supplier.upsert({
    where: { partyId: supplierParty.id },
    update: {},
    create: { partyId: supplierParty.id, companyId: company.id },
  });

  // Comprobantes: Factura B simple, sin impuestos, para no tener que
  // replicar el cálculo de VoucherLineTax de CreateVoucherUseCase acá.
  const facturaB = await prisma.voucherType.findUniqueOrThrow({ where: { code: 'FA_B' } });

  const companyId = company.id;

  async function nextVoucherNumber(): Promise<number> {
    const counter = await prisma.voucherCounter.upsert({
      where: {
        companyId_pointOfSaleId_voucherTypeId: {
          companyId,
          pointOfSaleId: pointOfSale.id,
          voucherTypeId: facturaB.id,
        },
      },
      update: { lastNumber: { increment: 1 } },
      create: {
        companyId,
        pointOfSaleId: pointOfSale.id,
        voucherTypeId: facturaB.id,
        lastNumber: 1,
      },
    });
    return counter.lastNumber;
  }

  const demoVouchers = [
    { customer: customers[0], item: items[0], quantity: '10', unitPrice: '1200.00' },
    { customer: customers[1], item: items[2], quantity: '5', unitPrice: '5000.00' },
  ];

  for (const dv of demoVouchers) {
    const subtotal = (Number(dv.quantity) * Number(dv.unitPrice)).toFixed(2);
    const voucherId = uuidv7();
    await prisma.voucher.create({
      data: {
        id: voucherId,
        companyId: company.id,
        branchId: branch.id,
        pointOfSaleId: pointOfSale.id,
        voucherTypeId: facturaB.id,
        number: await nextVoucherNumber(),
        partyId: dv.customer.partyId,
        warehouseId: dv.item.tracksStock ? warehouse.id : null,
        issueDate: new Date(),
        currency: 'ARS',
        subtotal,
        taxTotal: '0.00',
        total: subtotal,
        createdByUserId: adminUser.id,
        lines: {
          create: {
            id: uuidv7(),
            lineNumber: 1,
            itemId: dv.item.id,
            description: dv.item.name,
            quantity: dv.quantity,
            unitPrice: dv.unitPrice,
            subtotal,
          },
        },
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seed de demo completo: ${customers.length} clientes, 1 proveedor, ${items.length} ítems, ${demoVouchers.length} comprobantes en "${company.legalName}".`,
  );
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
