import { PrismaService } from '../../src/common/persistence/prisma.service';
import { PrismaUnitOfWork } from '../../src/common/infrastructure/persistence/prisma-unit-of-work';
import { PrismaItemRepository } from '../../src/modules/catalog/infrastructure/persistence/prisma-item.repository';
import { PrismaCategoryRepository } from '../../src/modules/catalog/infrastructure/persistence/prisma-category.repository';
import { PrismaTaxRepository } from '../../src/modules/catalog/infrastructure/persistence/prisma-tax.repository';
import { PrismaAuditLogRepository } from '../../src/common/infrastructure/persistence/prisma-audit-log.repository';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { CreateItemUseCase } from '../../src/modules/catalog/application/use-cases/create-item.use-case';
import { resetDatabase } from '../support/reset-database';

/**
 * Prueba de integración real contra Postgres (estrategos_test): verifica que
 * CreateItemUseCase (Item + ItemTax + AuditLog) hace rollback completo cuando
 * falla cualquier colaborador a mitad de la transacción — sin esto, un Item
 * quedaría creado sin sus impuestos ni su auditoría.
 */
describe('CreateItemUseCase (integración, DB real)', () => {
  const prisma = new PrismaService();
  const itemRepository = new PrismaItemRepository(prisma);
  const categoryRepository = new PrismaCategoryRepository(prisma);
  const taxRepository = new PrismaTaxRepository(prisma);
  const unitOfWork = new PrismaUnitOfWork(prisma);

  let companyId: string;
  let taxId: string;
  let requestingUserId: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);

    const tenant = await prisma.tenant.create({ data: { name: 'Tenant de prueba' } });
    const company = await prisma.company.create({
      data: { tenantId: tenant.id, legalName: 'Empresa de Prueba SRL' },
    });
    companyId = company.id;

    const tax = await prisma.tax.create({
      data: { companyId, name: 'IVA 21%', type: 'VAT', rate: '21', validFrom: new Date() },
    });
    taxId = tax.id;

    const user = await prisma.user.create({
      data: {
        email: 'propietario@estrategos.test',
        passwordHash: 'irrelevante-para-este-test',
        fullName: 'Propietario de Prueba',
      },
    });
    requestingUserId = user.id;
  });

  it('camino feliz: crea Item + ItemTax + AuditLog de forma atómica', async () => {
    const auditLogRepository = new PrismaAuditLogRepository(prisma);
    const useCase = new CreateItemUseCase(
      itemRepository,
      categoryRepository,
      taxRepository,
      auditLogRepository,
      unitOfWork,
    );

    const item = await useCase.execute({
      requestingUserId,
      requestingRoleName: 'Propietario',
      companyId,
      type: 'PRODUCT',
      sku: 'SKU-1',
      name: 'Resma de papel A4',
      unitOfMeasure: 'unidad',
      tracksStock: true,
      taxIds: [taxId],
    });

    const items = await prisma.item.findMany({ where: { companyId } });
    expect(items).toHaveLength(1);

    const itemTaxes = await prisma.itemTax.findMany({ where: { itemId: item.id } });
    expect(itemTaxes).toHaveLength(1);
    expect(itemTaxes[0].taxId).toBe(taxId);

    const auditEntries = await prisma.auditLog.findMany({
      where: { action: 'item.create', entityId: item.id },
    });
    expect(auditEntries).toHaveLength(1);
  });

  it('rollback: si falla la escritura de auditoría, no queda Item ni ItemTax huérfanos', async () => {
    const failingAuditLogRepository: AuditLogRepository = {
      record: jest.fn().mockRejectedValue(new Error('fallo forzado de auditoría')),
    };
    const useCase = new CreateItemUseCase(
      itemRepository,
      categoryRepository,
      taxRepository,
      failingAuditLogRepository,
      unitOfWork,
    );

    await expect(
      useCase.execute({
        requestingUserId,
        requestingRoleName: 'Propietario',
        companyId,
        type: 'PRODUCT',
        sku: 'SKU-NUNCA-DEBE-PERSISTIR',
        name: 'Ítem Que Nunca Debe Persistir',
        unitOfMeasure: 'unidad',
        tracksStock: true,
        taxIds: [taxId],
      }),
    ).rejects.toThrow('fallo forzado de auditoría');

    const items = await prisma.item.findMany({ where: { companyId } });
    expect(items).toHaveLength(0);

    const itemTaxes = await prisma.itemTax.findMany({});
    expect(itemTaxes).toHaveLength(0);

    const auditEntries = await prisma.auditLog.findMany({ where: { action: 'item.create' } });
    expect(auditEntries).toHaveLength(0);
  });
});
