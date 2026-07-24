import { PrismaService } from '../../src/common/persistence/prisma.service';
import { PrismaUnitOfWork } from '../../src/common/infrastructure/persistence/prisma-unit-of-work';
import { PrismaPartyRepository } from '../../src/modules/parties/infrastructure/persistence/prisma-party.repository';
import { PrismaCustomerRepository } from '../../src/modules/customers/infrastructure/persistence/prisma-customer.repository';
import { PrismaAuditLogRepository } from '../../src/common/infrastructure/persistence/prisma-audit-log.repository';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { CreateCustomerUseCase } from '../../src/modules/customers/application/use-cases/create-customer.use-case';
import { resetDatabase } from '../support/reset-database';

/**
 * Prueba de integración real contra Postgres (estrategos_test): verifica que
 * CreateCustomerUseCase (Party + Customer + AuditLog) hace rollback completo
 * cuando falla cualquier colaborador a mitad de la transacción — sin esto,
 * un CUIT quedaría con un Party creado pero sin su rol Cliente ni auditoría,
 * un registro inconsistente que alguien tendría que diagnosticar a mano.
 */
describe('CreateCustomerUseCase (integración, DB real)', () => {
  const prisma = new PrismaService();
  const partyRepository = new PrismaPartyRepository(prisma);
  const customerRepository = new PrismaCustomerRepository(prisma);
  const unitOfWork = new PrismaUnitOfWork(prisma);

  let companyId: string;
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

    const user = await prisma.user.create({
      data: {
        email: 'propietario@estrategos.test',
        passwordHash: 'irrelevante-para-este-test',
        fullName: 'Propietario de Prueba',
      },
    });
    requestingUserId = user.id;
  });

  it('camino feliz: crea Party + Customer + AuditLog de forma atómica', async () => {
    const auditLogRepository = new PrismaAuditLogRepository(prisma);
    const useCase = new CreateCustomerUseCase(
      customerRepository,
      partyRepository,
      auditLogRepository,
      unitOfWork,
    );

    const customer = await useCase.execute({
      requestingUserId,
      requestingRoleName: 'Propietario',
      companyId,
      legalName: 'Cliente Nuevo SRL',
      taxId: '30-12345678-9',
    });

    const parties = await prisma.party.findMany({ where: { companyId } });
    expect(parties).toHaveLength(1);

    const customers = await prisma.customer.findMany({ where: { companyId } });
    expect(customers).toHaveLength(1);
    expect(customers[0].partyId).toBe(customer.partyId);

    const auditEntries = await prisma.auditLog.findMany({
      where: { action: 'customer.create', entityId: customer.id },
    });
    expect(auditEntries).toHaveLength(1);
  });

  it('rollback: si falla la escritura de auditoría, no queda Party ni Customer huérfanos', async () => {
    const failingAuditLogRepository: AuditLogRepository = {
      record: jest.fn().mockRejectedValue(new Error('fallo forzado de auditoría')),
    };
    const useCase = new CreateCustomerUseCase(
      customerRepository,
      partyRepository,
      failingAuditLogRepository,
      unitOfWork,
    );

    await expect(
      useCase.execute({
        requestingUserId,
        requestingRoleName: 'Propietario',
        companyId,
        legalName: 'Cliente Que Nunca Debe Persistir SRL',
        taxId: '30-99999999-9',
      }),
    ).rejects.toThrow('fallo forzado de auditoría');

    const parties = await prisma.party.findMany({ where: { companyId } });
    expect(parties).toHaveLength(0); // el Party se revirtió junto con el Customer

    const customers = await prisma.customer.findMany({ where: { companyId } });
    expect(customers).toHaveLength(0);

    const auditEntries = await prisma.auditLog.findMany({
      where: { action: 'customer.create' },
    });
    expect(auditEntries).toHaveLength(0);
  });
});
