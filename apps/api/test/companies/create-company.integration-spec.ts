import { randomUUID } from 'crypto';
import { PrismaService } from '../../src/common/persistence/prisma.service';
import { PrismaUnitOfWork } from '../../src/common/infrastructure/persistence/prisma-unit-of-work';
import { PrismaCompanyRepository } from '../../src/modules/companies/infrastructure/persistence/prisma-company.repository';
import { PrismaCompanyUserRepository } from '../../src/modules/companies/infrastructure/persistence/prisma-company-user.repository';
import { PrismaAuditLogRepository } from '../../src/common/infrastructure/persistence/prisma-audit-log.repository';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { CreateCompanyUseCase } from '../../src/modules/companies/application/use-cases/create-company.use-case';
import { resetDatabase } from '../support/reset-database';

/**
 * Prueba de integración real contra Postgres (estrategos_test): verifica que
 * CreateCompanyUseCase — el ejemplo insignia del Hallazgo Crítico H1 de la
 * auditoría pre-Sprint-3 (Company + CompanyUser + AuditLog sin atomicidad) —
 * ahora hace rollback completo cuando cualquier colaborador falla a mitad de
 * la transacción. Ver docs/arquitectura/unit-of-work-y-transacciones.md §4.
 */
describe('CreateCompanyUseCase (integración, DB real)', () => {
  const prisma = new PrismaService();
  const companyRepository = new PrismaCompanyRepository(prisma);
  const companyUserRepository = new PrismaCompanyUserRepository(prisma);
  const unitOfWork = new PrismaUnitOfWork(prisma);

  let tenantId: string;
  let bootstrapCompanyId: string;
  let requestingUserId: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);

    const role = await prisma.role.upsert({
      where: { name: 'Administrador Estrategos' },
      update: {},
      create: { name: 'Administrador Estrategos' },
    });

    const tenant = await prisma.tenant.create({
      data: { name: 'Tenant de prueba' },
    });
    tenantId = tenant.id;

    const bootstrapCompany = await prisma.company.create({
      data: { tenantId, legalName: 'Empresa Bootstrap SRL' },
    });
    bootstrapCompanyId = bootstrapCompany.id;

    const user = await prisma.user.create({
      data: {
        email: `admin-${randomUUID()}@estrategos.test`,
        passwordHash: 'irrelevante-para-este-test',
        fullName: 'Admin de Prueba',
      },
    });
    requestingUserId = user.id;

    // El usuario ya administra la empresa bootstrap del tenant — así
    // hasRoleInTenant lo autoriza a crear una empresa NUEVA en ese tenant
    // (RN-EMP-03), igual que en producción.
    await prisma.companyUser.create({
      data: { userId: requestingUserId, companyId: bootstrapCompanyId, roleId: role.id },
    });
  });

  it('camino feliz: crea Company + CompanyUser + AuditLog de forma atómica', async () => {
    const auditLogRepository = new PrismaAuditLogRepository(prisma);
    const useCase = new CreateCompanyUseCase(
      companyRepository,
      companyUserRepository,
      auditLogRepository,
      unitOfWork,
    );

    const company = await useCase.execute({
      requestingUserId,
      tenantId,
      legalName: 'Empresa Nueva SRL',
    });

    const companies = await prisma.company.findMany({ where: { tenantId } });
    expect(companies).toHaveLength(2); // bootstrap + la nueva

    const membership = await prisma.companyUser.findUnique({
      where: { userId_companyId: { userId: requestingUserId, companyId: company.id } },
    });
    expect(membership).not.toBeNull();

    const auditEntries = await prisma.auditLog.findMany({
      where: { action: 'company.create', entityId: company.id },
    });
    expect(auditEntries).toHaveLength(1);
  });

  it('rollback: si falla la escritura de auditoría, no queda Company ni CompanyUser huérfanos', async () => {
    const failingAuditLogRepository: AuditLogRepository = {
      record: jest.fn().mockRejectedValue(new Error('fallo forzado de auditoría')),
    };
    const useCase = new CreateCompanyUseCase(
      companyRepository,
      companyUserRepository,
      failingAuditLogRepository,
      unitOfWork,
    );

    await expect(
      useCase.execute({
        requestingUserId,
        tenantId,
        legalName: 'Empresa Que Nunca Debe Persistir SRL',
      }),
    ).rejects.toThrow('fallo forzado de auditoría');

    const companies = await prisma.company.findMany({ where: { tenantId } });
    expect(companies).toHaveLength(1); // solo la bootstrap — la nueva se revirtió
    expect(companies[0].id).toBe(bootstrapCompanyId);

    const memberships = await prisma.companyUser.findMany({
      where: { userId: requestingUserId },
    });
    expect(memberships).toHaveLength(1); // solo la membresía bootstrap original

    const auditEntries = await prisma.auditLog.findMany({
      where: { action: 'company.create' },
    });
    expect(auditEntries).toHaveLength(0);
  });
});
