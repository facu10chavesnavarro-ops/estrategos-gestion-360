import { PrismaService } from '../../src/common/persistence/prisma.service';
import { PrismaUnitOfWork } from '../../src/common/infrastructure/persistence/prisma-unit-of-work';
import { PrismaPriceListRepository } from '../../src/modules/catalog/infrastructure/persistence/prisma-price-list.repository';
import { PrismaAuditLogRepository } from '../../src/common/infrastructure/persistence/prisma-audit-log.repository';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { CreatePriceListUseCase } from '../../src/modules/catalog/application/use-cases/create-price-list.use-case';
import { resetDatabase } from '../support/reset-database';

/**
 * Prueba de integración real contra Postgres (estrategos_test): verifica que
 * CreatePriceListUseCase con isDefault=true (clearDefaultForCompany + create +
 * AuditLog) hace rollback completo cuando falla a mitad de la transacción —
 * sin esto, una empresa podría quedar sin ninguna PriceList default (la
 * anterior se desmarcó pero la nueva nunca se creó) o con dos.
 */
describe('CreatePriceListUseCase con isDefault (integración, DB real)', () => {
  const prisma = new PrismaService();
  const priceListRepository = new PrismaPriceListRepository(prisma);
  const unitOfWork = new PrismaUnitOfWork(prisma);

  let companyId: string;
  let originalDefaultId: string;
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

    const original = await prisma.priceList.create({
      data: { companyId, name: 'Minorista', currency: 'ARS', isDefault: true },
    });
    originalDefaultId = original.id;

    const user = await prisma.user.create({
      data: {
        email: 'propietario@estrategos.test',
        passwordHash: 'irrelevante-para-este-test',
        fullName: 'Propietario de Prueba',
      },
    });
    requestingUserId = user.id;
  });

  it('camino feliz: desmarca la anterior y marca la nueva como default', async () => {
    const auditLogRepository = new PrismaAuditLogRepository(prisma);
    const useCase = new CreatePriceListUseCase(
      priceListRepository,
      auditLogRepository,
      unitOfWork,
    );

    const created = await useCase.execute({
      requestingUserId,
      requestingRoleName: 'Propietario',
      companyId,
      name: 'Mayorista',
      currency: 'ARS',
      isDefault: true,
    });

    const priceLists = await prisma.priceList.findMany({ where: { companyId } });
    const defaults = priceLists.filter((pl) => pl.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe(created.id);
  });

  it('rollback: si falla la auditoría, la lista original sigue siendo default y la nueva no se crea', async () => {
    const failingAuditLogRepository: AuditLogRepository = {
      record: jest.fn().mockRejectedValue(new Error('fallo forzado de auditoría')),
    };
    const useCase = new CreatePriceListUseCase(
      priceListRepository,
      failingAuditLogRepository,
      unitOfWork,
    );

    await expect(
      useCase.execute({
        requestingUserId,
        requestingRoleName: 'Propietario',
        companyId,
        name: 'Lista Que Nunca Debe Persistir',
        currency: 'ARS',
        isDefault: true,
      }),
    ).rejects.toThrow('fallo forzado de auditoría');

    const priceLists = await prisma.priceList.findMany({ where: { companyId } });
    expect(priceLists).toHaveLength(1); // solo la original — la nueva se revirtió

    const defaults = priceLists.filter((pl) => pl.isDefault);
    expect(defaults).toHaveLength(1); // la original sigue siendo default, no quedó "cero default"
    expect(defaults[0].id).toBe(originalDefaultId);
  });
});
