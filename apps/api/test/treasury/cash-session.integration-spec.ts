import { PrismaService } from '../../src/common/persistence/prisma.service';
import { PrismaUnitOfWork } from '../../src/common/infrastructure/persistence/prisma-unit-of-work';
import { PrismaCashRegisterRepository } from '../../src/modules/treasury/infrastructure/persistence/prisma-cash-register.repository';
import { PrismaCashSessionRepository } from '../../src/modules/treasury/infrastructure/persistence/prisma-cash-session.repository';
import { PrismaCashMovementRepository } from '../../src/modules/treasury/infrastructure/persistence/prisma-cash-movement.repository';
import { ApplyCashMovementService } from '../../src/modules/treasury/application/services/apply-cash-movement.service';
import { PrismaAccountingSettingsRepository } from '../../src/modules/accounting/infrastructure/persistence/prisma-accounting-settings.repository';
import { PrismaChartOfAccountRepository } from '../../src/modules/accounting/infrastructure/persistence/prisma-chart-of-account.repository';
import { PrismaJournalEntryRepository } from '../../src/modules/accounting/infrastructure/persistence/prisma-journal-entry.repository';
import { ApplyJournalEntryService } from '../../src/modules/accounting/application/services/apply-journal-entry.service';
import { PrismaAuditLogRepository } from '../../src/common/infrastructure/persistence/prisma-audit-log.repository';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { OpenCashSessionUseCase } from '../../src/modules/treasury/application/use-cases/open-cash-session.use-case';
import { CloseCashSessionUseCase } from '../../src/modules/treasury/application/use-cases/close-cash-session.use-case';
import { CreateCashMovementUseCase } from '../../src/modules/treasury/application/use-cases/create-cash-movement.use-case';
import { resetDatabase } from '../support/reset-database';

/**
 * Pruebas de integración reales contra Postgres (estrategos_test):
 * rollback de OpenCashSessionUseCase y camino feliz de punta a punta
 * (abrir sesión → movimientos manuales → cerrar con expectedBalance
 * correcto), per docs/sprint-3/05-caja-bancos.md §5.2.
 */
describe('CashSession (integración, DB real)', () => {
  const prisma = new PrismaService();
  const cashRegisterRepository = new PrismaCashRegisterRepository(prisma);
  const cashSessionRepository = new PrismaCashSessionRepository(prisma);
  const cashMovementRepository = new PrismaCashMovementRepository(prisma);
  const applyCashMovementService = new ApplyCashMovementService(cashMovementRepository);
  const chartOfAccountRepository = new PrismaChartOfAccountRepository(prisma);
  const accountingSettingsRepository = new PrismaAccountingSettingsRepository(prisma);
  const journalEntryRepository = new PrismaJournalEntryRepository(prisma);
  const applyJournalEntryService = new ApplyJournalEntryService(
    chartOfAccountRepository,
    journalEntryRepository,
  );
  const unitOfWork = new PrismaUnitOfWork(prisma);

  let companyId: string;
  let branchId: string;
  let cashRegisterId: string;
  let requestingUserId: string;

  function makeOpenCashSessionUseCase(auditLogRepository: AuditLogRepository) {
    return new OpenCashSessionUseCase(
      cashRegisterRepository,
      cashSessionRepository,
      auditLogRepository,
      unitOfWork,
    );
  }

  function makeCloseCashSessionUseCase(auditLogRepository: AuditLogRepository) {
    return new CloseCashSessionUseCase(
      cashSessionRepository,
      cashMovementRepository,
      auditLogRepository,
      unitOfWork,
    );
  }

  function makeCreateCashMovementUseCase(auditLogRepository: AuditLogRepository) {
    return new CreateCashMovementUseCase(
      cashSessionRepository,
      cashRegisterRepository,
      applyCashMovementService,
      accountingSettingsRepository,
      applyJournalEntryService,
      auditLogRepository,
      unitOfWork,
    );
  }

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

    const branch = await prisma.branch.create({ data: { companyId, name: 'Casa Central' } });
    branchId = branch.id;

    const cashRegister = await prisma.cashRegister.create({
      data: { companyId, branchId, name: 'Caja Principal' },
    });
    cashRegisterId = cashRegister.id;

    const user = await prisma.user.create({
      data: {
        email: 'propietario@estrategos.test',
        passwordHash: 'irrelevante-para-este-test',
        fullName: 'Propietario de Prueba',
      },
    });
    requestingUserId = user.id;
  });

  it('camino feliz: abrir sesión, movimientos manuales, cerrar con expectedBalance correcto', async () => {
    const auditLogRepository = new PrismaAuditLogRepository(prisma);
    const openUseCase = makeOpenCashSessionUseCase(auditLogRepository);
    const createMovementUseCase = makeCreateCashMovementUseCase(auditLogRepository);
    const closeUseCase = makeCloseCashSessionUseCase(auditLogRepository);

    const session = await openUseCase.execute({
      requestingUserId,
      requestingRoleName: 'Propietario',
      companyId,
      cashRegisterId,
      openingBalance: '100',
    });
    expect(session.isOpen).toBe(true);

    await createMovementUseCase.execute({
      requestingUserId,
      requestingRoleName: 'Propietario',
      companyId,
      cashSessionId: session.id,
      type: 'IN',
      amount: '50',
      reason: 'Aporte del dueño',
    });
    await createMovementUseCase.execute({
      requestingUserId,
      requestingRoleName: 'Propietario',
      companyId,
      cashSessionId: session.id,
      type: 'OUT',
      amount: '20',
      reason: 'Gasto menor',
    });

    // openingBalance 100 + IN 50 - OUT 20 = 130 esperado.
    const closed = await closeUseCase.execute({
      requestingUserId,
      requestingRoleName: 'Propietario',
      companyId,
      cashSessionId: session.id,
      closingBalance: '130',
    });

    expect(closed.isOpen).toBe(false);

    const movementRows = await prisma.cashMovement.findMany({
      where: { cashSessionId: session.id },
    });
    expect(movementRows).toHaveLength(2);

    const sessionRow = await prisma.cashSession.findUniqueOrThrow({ where: { id: session.id } });
    expect(sessionRow.expectedBalance?.toFixed(2)).toBe('130.00');
    expect(sessionRow.difference?.toFixed(2)).toBe('0.00');
    expect(sessionRow.closingBalance?.toFixed(2)).toBe('130.00');

    const auditEntries = await prisma.auditLog.findMany({
      where: { entityType: 'CashSession', entityId: session.id },
    });
    expect(auditEntries.map((entry) => entry.action).sort()).toEqual([
      'cash_session.close',
      'cash_session.open',
    ]);
  });

  it('rollback: si falla la auditoría, no queda CashSession huérfana', async () => {
    const failingAuditLogRepository: AuditLogRepository = {
      record: jest.fn().mockRejectedValue(new Error('fallo forzado de auditoría')),
    };
    const useCase = makeOpenCashSessionUseCase(failingAuditLogRepository);

    await expect(
      useCase.execute({
        requestingUserId,
        requestingRoleName: 'Propietario',
        companyId,
        cashRegisterId,
        openingBalance: '100',
      }),
    ).rejects.toThrow('fallo forzado de auditoría');

    const sessionRows = await prisma.cashSession.findMany({ where: { cashRegisterId } });
    expect(sessionRows).toHaveLength(0);
  });

  it('RN-CASH-02: rechaza abrir una segunda sesión mientras la primera sigue abierta', async () => {
    const auditLogRepository = new PrismaAuditLogRepository(prisma);
    const openUseCase = makeOpenCashSessionUseCase(auditLogRepository);

    await openUseCase.execute({
      requestingUserId,
      requestingRoleName: 'Propietario',
      companyId,
      cashRegisterId,
      openingBalance: '100',
    });

    await expect(
      openUseCase.execute({
        requestingUserId,
        requestingRoleName: 'Propietario',
        companyId,
        cashRegisterId,
        openingBalance: '50',
      }),
    ).rejects.toThrow('Esta caja ya tiene una sesión abierta.');

    const sessionRows = await prisma.cashSession.findMany({ where: { cashRegisterId } });
    expect(sessionRows).toHaveLength(1);
  });
});
