import { PrismaService } from '../../src/common/persistence/prisma.service';
import { PrismaUnitOfWork } from '../../src/common/infrastructure/persistence/prisma-unit-of-work';
import { PrismaAuditLogRepository } from '../../src/common/infrastructure/persistence/prisma-audit-log.repository';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';

import { PrismaChartOfAccountRepository } from '../../src/modules/accounting/infrastructure/persistence/prisma-chart-of-account.repository';
import { PrismaAccountingSettingsRepository } from '../../src/modules/accounting/infrastructure/persistence/prisma-accounting-settings.repository';
import { PrismaJournalEntryRepository } from '../../src/modules/accounting/infrastructure/persistence/prisma-journal-entry.repository';
import { ApplyJournalEntryService } from '../../src/modules/accounting/application/services/apply-journal-entry.service';
import { ActivateAccountingUseCase } from '../../src/modules/accounting/application/use-cases/activate-accounting.use-case';

import { PrismaVoucherTypeRepository } from '../../src/modules/vouchers/infrastructure/persistence/prisma-voucher-type.repository';
import { PrismaPointOfSaleRepository } from '../../src/modules/vouchers/infrastructure/persistence/prisma-point-of-sale.repository';
import { PrismaVoucherCounterRepository } from '../../src/modules/vouchers/infrastructure/persistence/prisma-voucher-counter.repository';
import { PrismaVoucherRepository } from '../../src/modules/vouchers/infrastructure/persistence/prisma-voucher.repository';
import { PrismaCustomerRepository } from '../../src/modules/customers/infrastructure/persistence/prisma-customer.repository';
import { PrismaSupplierRepository } from '../../src/modules/suppliers/infrastructure/persistence/prisma-supplier.repository';
import { PrismaItemRepository } from '../../src/modules/catalog/infrastructure/persistence/prisma-item.repository';
import { PrismaTaxRepository } from '../../src/modules/catalog/infrastructure/persistence/prisma-tax.repository';
import { PrismaCategoryRepository } from '../../src/modules/catalog/infrastructure/persistence/prisma-category.repository';
import { PrismaCompanyRepository } from '../../src/modules/companies/infrastructure/persistence/prisma-company.repository';
import { PrismaStockRepository } from '../../src/modules/inventory/infrastructure/persistence/prisma-stock.repository';
import { PrismaStockMovementRepository } from '../../src/modules/inventory/infrastructure/persistence/prisma-stock-movement.repository';
import { ApplyStockMovementService } from '../../src/modules/inventory/application/services/apply-stock-movement.service';
import {
  PrismaCustomerAccountRepository,
  PrismaCustomerAccountMovementRepository,
} from '../../src/modules/treasury/infrastructure/persistence/prisma-customer-account.repository';
import {
  PrismaSupplierAccountRepository,
  PrismaSupplierAccountMovementRepository,
} from '../../src/modules/treasury/infrastructure/persistence/prisma-supplier-account.repository';
import { ApplyCustomerAccountMovementService } from '../../src/modules/treasury/application/services/apply-customer-account-movement.service';
import { ApplySupplierAccountMovementService } from '../../src/modules/treasury/application/services/apply-supplier-account-movement.service';
import { PrismaPaymentMethodRepository } from '../../src/modules/treasury/infrastructure/persistence/prisma-payment-method.repository';
import { PrismaPaymentRepository } from '../../src/modules/treasury/infrastructure/persistence/prisma-payment.repository';
import { PrismaCashSessionRepository } from '../../src/modules/treasury/infrastructure/persistence/prisma-cash-session.repository';
import { PrismaCashRegisterRepository } from '../../src/modules/treasury/infrastructure/persistence/prisma-cash-register.repository';
import { PrismaCashMovementRepository } from '../../src/modules/treasury/infrastructure/persistence/prisma-cash-movement.repository';
import { PrismaBankAccountRepository } from '../../src/modules/treasury/infrastructure/persistence/prisma-bank-account.repository';
import { PrismaBankMovementRepository } from '../../src/modules/treasury/infrastructure/persistence/prisma-bank-movement.repository';
import { ApplyCashMovementService } from '../../src/modules/treasury/application/services/apply-cash-movement.service';
import { ApplyBankMovementService } from '../../src/modules/treasury/application/services/apply-bank-movement.service';
import { PrismaCompanyPaymentMethodAccountRepository } from '../../src/modules/accounting/infrastructure/persistence/prisma-company-payment-method-account.repository';

import { CreateVoucherUseCase } from '../../src/modules/vouchers/application/use-cases/create-voucher.use-case';
import { CreatePaymentUseCase } from '../../src/modules/treasury/application/use-cases/create-payment.use-case';
import { resetDatabase } from '../support/reset-database';

/**
 * Pruebas de integración reales contra Postgres (estrategos_test) para el
 * flujo completo de Contabilidad (Sprint 4): activar → mapear cuentas →
 * confirmar Factura → confirmar Cobro → verificar los asientos generados
 * y que un fallo a mitad de camino no deja un asiento huérfano.
 */
describe('Contabilidad (integración, DB real)', () => {
  const prisma = new PrismaService();
  const unitOfWork = new PrismaUnitOfWork(prisma);

  const chartOfAccountRepository = new PrismaChartOfAccountRepository(prisma);
  const accountingSettingsRepository = new PrismaAccountingSettingsRepository(prisma);
  const journalEntryRepository = new PrismaJournalEntryRepository(prisma);
  const applyJournalEntryService = new ApplyJournalEntryService(
    chartOfAccountRepository,
    journalEntryRepository,
  );

  const voucherTypeRepository = new PrismaVoucherTypeRepository(prisma);
  const pointOfSaleRepository = new PrismaPointOfSaleRepository(prisma);
  const voucherCounterRepository = new PrismaVoucherCounterRepository(prisma);
  const voucherRepository = new PrismaVoucherRepository(prisma);
  const customerRepository = new PrismaCustomerRepository(prisma);
  const supplierRepository = new PrismaSupplierRepository(prisma);
  const itemRepository = new PrismaItemRepository(prisma);
  const taxRepository = new PrismaTaxRepository(prisma);
  const categoryRepository = new PrismaCategoryRepository(prisma);
  const companyRepository = new PrismaCompanyRepository(prisma);
  const stockRepository = new PrismaStockRepository(prisma);
  const stockMovementRepository = new PrismaStockMovementRepository(prisma);
  const applyStockMovementService = new ApplyStockMovementService(
    stockRepository,
    stockMovementRepository,
  );
  const customerAccountRepository = new PrismaCustomerAccountRepository(prisma);
  const customerAccountMovementRepository = new PrismaCustomerAccountMovementRepository(prisma);
  const supplierAccountRepository = new PrismaSupplierAccountRepository(prisma);
  const supplierAccountMovementRepository = new PrismaSupplierAccountMovementRepository(prisma);
  const applyCustomerAccountMovementService = new ApplyCustomerAccountMovementService(
    customerAccountRepository,
    customerAccountMovementRepository,
  );
  const applySupplierAccountMovementService = new ApplySupplierAccountMovementService(
    supplierAccountRepository,
    supplierAccountMovementRepository,
  );

  const paymentMethodRepository = new PrismaPaymentMethodRepository(prisma);
  const paymentRepository = new PrismaPaymentRepository(prisma);
  const cashSessionRepository = new PrismaCashSessionRepository(prisma);
  const cashRegisterRepository = new PrismaCashRegisterRepository(prisma);
  const cashMovementRepository = new PrismaCashMovementRepository(prisma);
  const bankAccountRepository = new PrismaBankAccountRepository(prisma);
  const bankMovementRepository = new PrismaBankMovementRepository(prisma);
  const applyCashMovementService = new ApplyCashMovementService(cashMovementRepository);
  const applyBankMovementService = new ApplyBankMovementService(bankMovementRepository);
  const companyPaymentMethodAccountRepository = new PrismaCompanyPaymentMethodAccountRepository(
    prisma,
  );

  let companyId: string;
  let branchId: string;
  let itemId: string;
  let categoryId: string;
  let taxId: string;
  let partyId: string;
  let pointOfSaleId: string;
  let voucherTypeId: string;
  let requestingUserId: string;
  let efectivoMethodId: string;
  let cashRegisterId: string;
  let cashSessionId: string;

  let ventasAccountId: string;
  let ivaDebitoAccountId: string;
  let cajaAccountId: string;

  function makeCreateVoucherUseCase(auditLogRepository: AuditLogRepository) {
    return new CreateVoucherUseCase(
      voucherTypeRepository,
      pointOfSaleRepository,
      voucherCounterRepository,
      voucherRepository,
      customerRepository,
      supplierRepository,
      itemRepository,
      taxRepository,
      categoryRepository,
      companyRepository,
      applyStockMovementService,
      applyCustomerAccountMovementService,
      applySupplierAccountMovementService,
      accountingSettingsRepository,
      applyJournalEntryService,
      auditLogRepository,
      unitOfWork,
    );
  }

  function makeCreatePaymentUseCase(auditLogRepository: AuditLogRepository) {
    return new CreatePaymentUseCase(
      paymentMethodRepository,
      paymentRepository,
      customerRepository,
      supplierRepository,
      voucherRepository,
      companyRepository,
      cashSessionRepository,
      cashRegisterRepository,
      bankAccountRepository,
      applyCustomerAccountMovementService,
      applySupplierAccountMovementService,
      applyCashMovementService,
      applyBankMovementService,
      accountingSettingsRepository,
      companyPaymentMethodAccountRepository,
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

    const category = await prisma.category.create({ data: { companyId, name: 'Servicios' } });
    categoryId = category.id;

    const tax = await prisma.tax.create({
      data: { companyId, name: 'IVA 21%', type: 'VAT', rate: '21', validFrom: new Date('2020-01-01') },
    });
    taxId = tax.id;

    const item = await prisma.item.create({
      data: {
        companyId,
        type: 'SERVICE',
        sku: 'SRV-1',
        categoryId,
        name: 'Servicio de consultoría',
        unitOfMeasure: 'hora',
        tracksStock: false,
        itemTaxes: { create: [{ taxId }] },
      },
    });
    itemId = item.id;

    const party = await prisma.party.create({
      data: { companyId, legalName: 'Cliente de Prueba SRL' },
    });
    partyId = party.id;
    await prisma.customer.create({ data: { partyId, companyId } });

    const pointOfSale = await prisma.pointOfSale.create({
      data: { companyId, branchId, code: '0001', name: 'Casa Central' },
    });
    pointOfSaleId = pointOfSale.id;

    const voucherType = await prisma.voucherType.findUniqueOrThrow({ where: { code: 'FA_A' } });
    voucherTypeId = voucherType.id;

    const paymentMethod = await prisma.paymentMethod.findUniqueOrThrow({
      where: { code: 'EFECTIVO' },
    });
    efectivoMethodId = paymentMethod.id;

    const user = await prisma.user.create({
      data: {
        email: 'propietario@estrategos.test',
        passwordHash: 'irrelevante-para-este-test',
        fullName: 'Propietario de Prueba',
      },
    });
    requestingUserId = user.id;

    const cashRegister = await prisma.cashRegister.create({
      data: { companyId, branchId, name: 'Caja Principal' },
    });
    cashRegisterId = cashRegister.id;
    const cashSession = await prisma.cashSession.create({
      data: { cashRegisterId, openedByUserId: requestingUserId, openingBalance: '0' },
    });
    cashSessionId = cashSession.id;

    // Activa Contabilidad (clona la plantilla + crea AccountingSettings) y
    // mapea las cuentas mínimas necesarias para una Factura + un Cobro.
    const activateAccountingUseCase = new ActivateAccountingUseCase(
      chartOfAccountRepository,
      accountingSettingsRepository,
      new PrismaAuditLogRepository(prisma),
      unitOfWork,
    );
    await activateAccountingUseCase.execute({
      requestingUserId,
      requestingRoleName: 'Propietario',
      companyId,
    });

    const ventas = await prisma.chartOfAccount.findFirstOrThrow({
      where: { companyId, code: '4.1' },
    });
    ventasAccountId = ventas.id;
    const ivaDebito = await prisma.chartOfAccount.findFirstOrThrow({
      where: { companyId, code: '2.1.02' },
    });
    ivaDebitoAccountId = ivaDebito.id;
    const caja = await prisma.chartOfAccount.findFirstOrThrow({
      where: { companyId, code: '1.1.01' },
    });
    cajaAccountId = caja.id;

    await prisma.category.update({ where: { id: categoryId }, data: { salesAccountId: ventasAccountId } });
    await prisma.tax.update({ where: { id: taxId }, data: { salesAccountId: ivaDebitoAccountId } });
    await prisma.cashRegister.update({ where: { id: cashRegisterId }, data: { accountId: cajaAccountId } });
  });

  it('camino feliz: Factura + Cobro generan asientos balanceados y el Libro Mayor de Caja refleja el ingreso', async () => {
    const auditLogRepository = new PrismaAuditLogRepository(prisma);
    const createVoucherUseCase = makeCreateVoucherUseCase(auditLogRepository);

    const invoice = await createVoucherUseCase.execute({
      requestingUserId,
      requestingRoleName: 'Propietario',
      companyId,
      branchId,
      pointOfSaleId,
      voucherTypeId,
      partyId,
      lines: [{ itemId, description: 'Consultoría', quantity: '10', unitPrice: '121' }],
    });
    // subtotal 1210, IVA 21% = 254.10, total 1464.10.
    expect(Number(invoice.total).toFixed(2)).toBe('1464.10');

    const voucherEntry = await prisma.journalEntry.findFirstOrThrow({
      where: { sourceType: 'VOUCHER', sourceId: invoice.id },
      include: { lines: true },
    });
    expect(voucherEntry.lines).toHaveLength(3);
    const totalDebit = voucherEntry.lines.reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredit = voucherEntry.lines.reduce((sum, l) => sum + Number(l.credit), 0);
    expect(totalDebit).toBeCloseTo(totalCredit, 2);
    expect(totalDebit).toBeCloseTo(1464.1, 2);

    const ventasLine = voucherEntry.lines.find((l) => l.accountId === ventasAccountId);
    expect(ventasLine?.credit.toFixed(2)).toBe('1210.00');
    const ivaLine = voucherEntry.lines.find((l) => l.accountId === ivaDebitoAccountId);
    expect(ivaLine?.credit.toFixed(2)).toBe('254.10');

    const createPaymentUseCase = makeCreatePaymentUseCase(auditLogRepository);
    const payment = await createPaymentUseCase.execute({
      requestingUserId,
      requestingRoleName: 'Propietario',
      companyId,
      partyId,
      direction: 'COLLECTION',
      methodDetails: [{ paymentMethodId: efectivoMethodId, amount: '1464.10' }],
      allocations: [{ voucherId: invoice.id, amountApplied: '1464.10' }],
      cashSessionId,
    });

    const paymentEntry = await prisma.journalEntry.findFirstOrThrow({
      where: { sourceType: 'PAYMENT', sourceId: payment.id },
      include: { lines: true },
    });
    expect(paymentEntry.lines).toHaveLength(2);
    const cajaLine = paymentEntry.lines.find((l) => l.accountId === cajaAccountId);
    expect(cajaLine?.debit.toFixed(2)).toBe('1464.10');

    // Libro Mayor: la línea de la cuenta Caja debe reflejar el ingreso del cobro.
    const ledgerLines = await journalEntryRepository.findLedgerByAccount(cajaAccountId, companyId);
    expect(ledgerLines).toHaveLength(1);
    expect(Number(ledgerLines[0].debit).toFixed(2)).toBe('1464.10');
  });

  it('rollback: si falla la auditoría del Cobro, no queda un asiento huérfano', async () => {
    const createVoucherUseCase = makeCreateVoucherUseCase(new PrismaAuditLogRepository(prisma));
    const invoice = await createVoucherUseCase.execute({
      requestingUserId,
      requestingRoleName: 'Propietario',
      companyId,
      branchId,
      pointOfSaleId,
      voucherTypeId,
      partyId,
      lines: [{ itemId, description: 'Consultoría', quantity: '10', unitPrice: '121' }],
    });

    const failingAuditLogRepository: AuditLogRepository = {
      record: jest.fn().mockRejectedValue(new Error('fallo forzado de auditoría')),
    };
    const createPaymentUseCase = makeCreatePaymentUseCase(failingAuditLogRepository);

    await expect(
      createPaymentUseCase.execute({
        requestingUserId,
        requestingRoleName: 'Propietario',
        companyId,
        partyId,
        direction: 'COLLECTION',
        methodDetails: [{ paymentMethodId: efectivoMethodId, amount: '1464.10' }],
        allocations: [{ voucherId: invoice.id, amountApplied: '1464.10' }],
        cashSessionId,
      }),
    ).rejects.toThrow('fallo forzado de auditoría');

    const paymentEntries = await prisma.journalEntry.findMany({ where: { sourceType: 'PAYMENT' } });
    expect(paymentEntries).toHaveLength(0);

    const payments = await prisma.payment.findMany({ where: { companyId } });
    expect(payments).toHaveLength(0);

    const cashMovements = await prisma.cashMovement.findMany({ where: { cashSessionId } });
    expect(cashMovements).toHaveLength(0);
  });

  it('RN-ACC-05: rechaza confirmar la Factura si la categoría no tiene cuenta de ventas mapeada', async () => {
    await prisma.category.update({ where: { id: categoryId }, data: { salesAccountId: null } });
    const createVoucherUseCase = makeCreateVoucherUseCase(new PrismaAuditLogRepository(prisma));

    await expect(
      createVoucherUseCase.execute({
        requestingUserId,
        requestingRoleName: 'Propietario',
        companyId,
        branchId,
        pointOfSaleId,
        voucherTypeId,
        partyId,
        lines: [{ itemId, description: 'Consultoría', quantity: '10', unitPrice: '121' }],
      }),
    ).rejects.toThrow('cuenta contable mapeada');

    const vouchers = await prisma.voucher.findMany({ where: { companyId } });
    expect(vouchers).toHaveLength(0);
  });
});
