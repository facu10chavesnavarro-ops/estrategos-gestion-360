import { PrismaService } from '../../src/common/persistence/prisma.service';
import { PrismaUnitOfWork } from '../../src/common/infrastructure/persistence/prisma-unit-of-work';
import { PrismaVoucherTypeRepository } from '../../src/modules/vouchers/infrastructure/persistence/prisma-voucher-type.repository';
import { PrismaPointOfSaleRepository } from '../../src/modules/vouchers/infrastructure/persistence/prisma-point-of-sale.repository';
import { PrismaVoucherCounterRepository } from '../../src/modules/vouchers/infrastructure/persistence/prisma-voucher-counter.repository';
import { PrismaVoucherRepository } from '../../src/modules/vouchers/infrastructure/persistence/prisma-voucher.repository';
import { PrismaCustomerRepository } from '../../src/modules/customers/infrastructure/persistence/prisma-customer.repository';
import { PrismaSupplierRepository } from '../../src/modules/suppliers/infrastructure/persistence/prisma-supplier.repository';
import { PrismaItemRepository } from '../../src/modules/catalog/infrastructure/persistence/prisma-item.repository';
import { PrismaTaxRepository } from '../../src/modules/catalog/infrastructure/persistence/prisma-tax.repository';
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
import { PrismaPaymentMethodRepository } from '../../src/modules/treasury/infrastructure/persistence/prisma-payment-method.repository';
import { PrismaPaymentRepository } from '../../src/modules/treasury/infrastructure/persistence/prisma-payment.repository';
import { PrismaCashSessionRepository } from '../../src/modules/treasury/infrastructure/persistence/prisma-cash-session.repository';
import { PrismaCashMovementRepository } from '../../src/modules/treasury/infrastructure/persistence/prisma-cash-movement.repository';
import { PrismaBankAccountRepository } from '../../src/modules/treasury/infrastructure/persistence/prisma-bank-account.repository';
import { PrismaBankMovementRepository } from '../../src/modules/treasury/infrastructure/persistence/prisma-bank-movement.repository';
import { ApplyCustomerAccountMovementService } from '../../src/modules/treasury/application/services/apply-customer-account-movement.service';
import { ApplySupplierAccountMovementService } from '../../src/modules/treasury/application/services/apply-supplier-account-movement.service';
import { ApplyCashMovementService } from '../../src/modules/treasury/application/services/apply-cash-movement.service';
import { ApplyBankMovementService } from '../../src/modules/treasury/application/services/apply-bank-movement.service';
import { PrismaAuditLogRepository } from '../../src/common/infrastructure/persistence/prisma-audit-log.repository';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { CreateVoucherUseCase } from '../../src/modules/vouchers/application/use-cases/create-voucher.use-case';
import { CreatePaymentUseCase } from '../../src/modules/treasury/application/use-cases/create-payment.use-case';
import { resetDatabase } from '../support/reset-database';

/**
 * Pruebas de integración reales contra Postgres (estrategos_test) para
 * CreatePaymentUseCase: rollback real y camino feliz de punta a punta
 * (Factura de Venta → saldo sube → cobro parcial → saldo baja lo cobrado).
 */
describe('CreatePaymentUseCase (integración, DB real)', () => {
  const prisma = new PrismaService();
  const voucherTypeRepository = new PrismaVoucherTypeRepository(prisma);
  const pointOfSaleRepository = new PrismaPointOfSaleRepository(prisma);
  const voucherCounterRepository = new PrismaVoucherCounterRepository(prisma);
  const voucherRepository = new PrismaVoucherRepository(prisma);
  const customerRepository = new PrismaCustomerRepository(prisma);
  const supplierRepository = new PrismaSupplierRepository(prisma);
  const itemRepository = new PrismaItemRepository(prisma);
  const taxRepository = new PrismaTaxRepository(prisma);
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
  const cashMovementRepository = new PrismaCashMovementRepository(prisma);
  const bankAccountRepository = new PrismaBankAccountRepository(prisma);
  const bankMovementRepository = new PrismaBankMovementRepository(prisma);
  const applyCashMovementService = new ApplyCashMovementService(cashMovementRepository);
  const applyBankMovementService = new ApplyBankMovementService(bankMovementRepository);
  const unitOfWork = new PrismaUnitOfWork(prisma);

  let companyId: string;
  let branchId: string;
  let itemId: string;
  let partyId: string;
  let customerId: string;
  let pointOfSaleId: string;
  let voucherTypeId: string;
  let requestingUserId: string;
  let efectivoMethodId: string;
  let invoiceVoucherId: string;
  let cashSessionId: string;

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
      companyRepository,
      applyStockMovementService,
      applyCustomerAccountMovementService,
      applySupplierAccountMovementService,
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
      bankAccountRepository,
      applyCustomerAccountMovementService,
      applySupplierAccountMovementService,
      applyCashMovementService,
      applyBankMovementService,
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

    const item = await prisma.item.create({
      data: {
        companyId,
        type: 'SERVICE',
        sku: 'SRV-1',
        name: 'Servicio de consultoría',
        unitOfMeasure: 'hora',
        tracksStock: false,
      },
    });
    itemId = item.id;

    const party = await prisma.party.create({
      data: { companyId, legalName: 'Cliente de Prueba SRL' },
    });
    partyId = party.id;
    const customer = await prisma.customer.create({ data: { partyId, companyId } });
    customerId = customer.id;

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
    const cashSession = await prisma.cashSession.create({
      data: {
        cashRegisterId: cashRegister.id,
        openedByUserId: requestingUserId,
        openingBalance: '0',
      },
    });
    cashSessionId = cashSession.id;

    // Factura de Venta real (vía el caso de uso de Sprint 3.3) para tener un
    // comprobante y un saldo de cuenta corriente genuinos antes de cobrar.
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
    invoiceVoucherId = invoice.id;
  });

  it('camino feliz: Factura sube el saldo, cobro parcial lo baja lo cobrado', async () => {
    const customerAccountBeforePayment = await prisma.customerAccount.findUnique({
      where: { customerId },
    });
    expect(customerAccountBeforePayment?.currentBalance.toFixed(2)).toBe('1210.00');

    const auditLogRepository = new PrismaAuditLogRepository(prisma);
    const useCase = makeCreatePaymentUseCase(auditLogRepository);

    const payment = await useCase.execute({
      requestingUserId,
      requestingRoleName: 'Propietario',
      companyId,
      partyId,
      direction: 'COLLECTION',
      methodDetails: [{ paymentMethodId: efectivoMethodId, amount: '500' }],
      allocations: [{ voucherId: invoiceVoucherId, amountApplied: '500' }],
      cashSessionId,
    });

    const paymentRows = await prisma.payment.findMany({ where: { id: payment.id } });
    expect(paymentRows).toHaveLength(1);
    expect(paymentRows[0].totalAmount.toFixed(2)).toBe('500.00');

    const allocationRows = await prisma.paymentAllocation.findMany({
      where: { paymentId: payment.id },
    });
    expect(allocationRows).toHaveLength(1);
    expect(allocationRows[0].amountApplied.toFixed(2)).toBe('500.00');

    const methodDetailRows = await prisma.paymentMethodDetail.findMany({
      where: { paymentId: payment.id },
    });
    expect(methodDetailRows).toHaveLength(1);

    const customerAccount = await prisma.customerAccount.findUnique({ where: { customerId } });
    expect(customerAccount?.currentBalance.toFixed(2)).toBe('710.00'); // 1210 - 500

    const movements = await prisma.customerAccountMovement.findMany({
      where: { customerAccountId: customerAccount!.id, paymentId: payment.id },
    });
    expect(movements).toHaveLength(1);
    expect(movements[0].type).toBe('CREDIT');
    expect(movements[0].balanceAfter.toFixed(2)).toBe('710.00');

    // RN-PAY-10: Efectivo genera un CashMovement IN ligado al Payment.
    const cashMovements = await prisma.cashMovement.findMany({
      where: { cashSessionId, paymentId: payment.id },
    });
    expect(cashMovements).toHaveLength(1);
    expect(cashMovements[0].type).toBe('IN');
    expect(cashMovements[0].amount.toFixed(2)).toBe('500.00');

    const auditEntries = await prisma.auditLog.findMany({
      where: { action: 'payment.create', entityId: payment.id },
    });
    expect(auditEntries).toHaveLength(1);
  });

  it('RN-PAY-07: un pago con Cheque crea el CheckDetail (EN_CARTERA) enlazado por FK', async () => {
    const cheque = await prisma.paymentMethod.findUniqueOrThrow({ where: { code: 'CHEQUE' } });
    const auditLogRepository = new PrismaAuditLogRepository(prisma);
    const useCase = makeCreatePaymentUseCase(auditLogRepository);

    const payment = await useCase.execute({
      requestingUserId,
      requestingRoleName: 'Propietario',
      companyId,
      partyId,
      direction: 'COLLECTION',
      methodDetails: [
        {
          paymentMethodId: cheque.id,
          amount: '1210',
          checkDetail: { number: '00012345', bankName: 'Banco Nación', dueDate: '2026-09-01' },
        },
      ],
      allocations: [{ voucherId: invoiceVoucherId, amountApplied: '1210' }],
    });

    const methodDetailRows = await prisma.paymentMethodDetail.findMany({
      where: { paymentId: payment.id },
      include: { checkDetail: true },
    });
    expect(methodDetailRows).toHaveLength(1);
    expect(methodDetailRows[0].checkDetail).not.toBeNull();
    expect(methodDetailRows[0].checkDetail?.number).toBe('00012345');
    expect(methodDetailRows[0].checkDetail?.status).toBe('EN_CARTERA');
  });

  it('rollback: si falla la auditoría, no queda Payment, imputación ni cambio en la cuenta corriente', async () => {
    const failingAuditLogRepository: AuditLogRepository = {
      record: jest.fn().mockRejectedValue(new Error('fallo forzado de auditoría')),
    };
    const useCase = makeCreatePaymentUseCase(failingAuditLogRepository);

    await expect(
      useCase.execute({
        requestingUserId,
        requestingRoleName: 'Propietario',
        companyId,
        partyId,
        direction: 'COLLECTION',
        methodDetails: [{ paymentMethodId: efectivoMethodId, amount: '500' }],
        allocations: [{ voucherId: invoiceVoucherId, amountApplied: '500' }],
        cashSessionId,
      }),
    ).rejects.toThrow('fallo forzado de auditoría');

    const paymentRows = await prisma.payment.findMany({ where: { companyId } });
    expect(paymentRows).toHaveLength(0);

    const allocationRows = await prisma.paymentAllocation.findMany({});
    expect(allocationRows).toHaveLength(0);

    // El saldo queda exactamente como lo dejó la factura, sin el cobro fallido aplicado.
    const customerAccount = await prisma.customerAccount.findUnique({ where: { customerId } });
    expect(customerAccount?.currentBalance.toFixed(2)).toBe('1210.00');

    const movementsAfterInvoiceOnly = await prisma.customerAccountMovement.findMany({
      where: { customerAccountId: customerAccount!.id },
    });
    expect(movementsAfterInvoiceOnly).toHaveLength(1); // solo el de la factura, ninguno del cobro

    // Tampoco queda un CashMovement huérfano.
    const cashMovements = await prisma.cashMovement.findMany({ where: { cashSessionId } });
    expect(cashMovements).toHaveLength(0);
  });
});
