import { CreatePaymentUseCase } from '../../src/modules/treasury/application/use-cases/create-payment.use-case';
import { PaymentMethodRepository } from '../../src/modules/treasury/domain/repositories/payment-method.repository';
import { PaymentMethodEntity } from '../../src/modules/treasury/domain/entities/payment-method.entity';
import { PaymentRepository } from '../../src/modules/treasury/domain/repositories/payment.repository';
import { PaymentEntity } from '../../src/modules/treasury/domain/entities/payment.entity';
import { CustomerRepository } from '../../src/modules/customers/domain/repositories/customer.repository';
import { CustomerEntity } from '../../src/modules/customers/domain/entities/customer.entity';
import { SupplierRepository } from '../../src/modules/suppliers/domain/repositories/supplier.repository';
import { SupplierEntity } from '../../src/modules/suppliers/domain/entities/supplier.entity';
import { VoucherRepository } from '../../src/modules/vouchers/domain/repositories/voucher.repository';
import { VoucherEntity } from '../../src/modules/vouchers/domain/entities/voucher.entity';
import { CompanyRepository } from '../../src/modules/companies/domain/repositories/company.repository';
import { CompanyEntity } from '../../src/modules/companies/domain/entities/company.entity';
import { ApplyCustomerAccountMovementService } from '../../src/modules/treasury/application/services/apply-customer-account-movement.service';
import { ApplySupplierAccountMovementService } from '../../src/modules/treasury/application/services/apply-supplier-account-movement.service';
import { ApplyCashMovementService } from '../../src/modules/treasury/application/services/apply-cash-movement.service';
import { ApplyBankMovementService } from '../../src/modules/treasury/application/services/apply-bank-movement.service';
import { CustomerAccountMovementEntity } from '../../src/modules/treasury/domain/entities/customer-account.entity';
import { SupplierAccountMovementEntity } from '../../src/modules/treasury/domain/entities/supplier-account.entity';
import { CashSessionRepository } from '../../src/modules/treasury/domain/repositories/cash-session.repository';
import { CashSessionEntity } from '../../src/modules/treasury/domain/entities/cash-session.entity';
import { CashMovementEntity } from '../../src/modules/treasury/domain/entities/cash-movement.entity';
import { BankAccountRepository } from '../../src/modules/treasury/domain/repositories/bank-account.repository';
import { BankAccountEntity } from '../../src/modules/treasury/domain/entities/bank-account.entity';
import { BankMovementEntity } from '../../src/modules/treasury/domain/entities/bank-movement.entity';
import { CashRegisterRepository } from '../../src/modules/treasury/domain/repositories/cash-register.repository';
import { CashRegisterEntity } from '../../src/modules/treasury/domain/entities/cash-register.entity';
import { AccountingSettingsRepository } from '../../src/modules/accounting/domain/repositories/accounting-settings.repository';
import { AccountingSettingsEntity } from '../../src/modules/accounting/domain/entities/accounting-settings.entity';
import { CompanyPaymentMethodAccountRepository } from '../../src/modules/accounting/domain/repositories/company-payment-method-account.repository';
import { CompanyPaymentMethodAccountEntity } from '../../src/modules/accounting/domain/entities/company-payment-method-account.entity';
import { ApplyJournalEntryService } from '../../src/modules/accounting/application/services/apply-journal-entry.service';
import {
  MissingCashRegisterAccountMappingError,
  MissingBankAccountMappingError,
  MissingPaymentMethodAccountMappingError,
} from '../../src/modules/accounting/domain/errors/accounting.errors';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import {
  InvalidPaymentCounterpartyError,
  EmptyPaymentMethodDetailsError,
  InvalidPaymentMethodError,
  MissingCheckDetailError,
  AllocationExceedsPaymentAmountError,
  InvalidAllocationVoucherError,
  VoucherOverpaidError,
  MissingCashSessionError,
  InvalidCashSessionError,
  MissingBankAccountError,
  InvalidBankAccountError,
} from '../../src/modules/treasury/domain/errors/payment.errors';
import { createFakeUnitOfWork } from '../support/fake-unit-of-work';

function makePaymentMethod(overrides: Partial<PaymentMethodEntity> = {}): PaymentMethodEntity {
  return new PaymentMethodEntity(
    overrides.id ?? 'method-efectivo',
    overrides.code ?? 'EFECTIVO',
    overrides.name ?? 'Efectivo',
    overrides.requiresCheckDetail ?? false,
    overrides.requiresCardDetail ?? false,
    overrides.requiresCashMovement ?? true,
    overrides.requiresBankMovement ?? false,
    overrides.isActive ?? true,
  );
}

function makeCustomer(overrides: Partial<CustomerEntity> = {}): CustomerEntity {
  return new CustomerEntity(
    overrides.id ?? 'customer-1',
    overrides.partyId ?? 'party-1',
    overrides.companyId ?? 'company-1',
    overrides.legalName ?? 'Cliente SRL',
    overrides.taxId ?? null,
    overrides.taxCondition ?? null,
    overrides.email ?? null,
    overrides.phone ?? null,
    overrides.address ?? null,
    overrides.contactName ?? null,
    overrides.notes ?? null,
    overrides.paymentTermDays ?? null,
    overrides.creditLimit ?? null,
    overrides.isActive ?? true,
  );
}

function makeSupplier(overrides: Partial<SupplierEntity> = {}): SupplierEntity {
  return new SupplierEntity(
    overrides.id ?? 'supplier-1',
    overrides.partyId ?? 'party-1',
    overrides.companyId ?? 'company-1',
    overrides.legalName ?? 'Proveedor SRL',
    overrides.taxId ?? null,
    overrides.taxCondition ?? null,
    overrides.email ?? null,
    overrides.phone ?? null,
    overrides.address ?? null,
    overrides.contactName ?? null,
    overrides.notes ?? null,
    overrides.paymentTermDays ?? null,
    overrides.bankName ?? null,
    overrides.bankAccountHolder ?? null,
    overrides.bankCbu ?? null,
    overrides.isActive ?? true,
  );
}

function makeCompany(overrides: Partial<CompanyEntity> = {}): CompanyEntity {
  return new CompanyEntity(
    overrides.id ?? 'company-1',
    overrides.tenantId ?? 'tenant-1',
    overrides.legalName ?? 'Empresa Piloto SRL',
    overrides.taxId ?? null,
    overrides.taxCondition ?? null,
    overrides.activity ?? null,
    overrides.address ?? null,
    overrides.contactName ?? null,
    overrides.contactEmail ?? null,
    overrides.contactPhone ?? null,
    overrides.logoUrl ?? null,
    overrides.currency ?? 'ARS',
    overrides.timezone ?? 'America/Argentina/Jujuy',
    overrides.allowNegativeStock ?? false,
    overrides.isActive ?? true,
  );
}

function makeVoucher(overrides: Partial<VoucherEntity> = {}): VoucherEntity {
  return new VoucherEntity(
    overrides.id ?? 'voucher-1',
    overrides.companyId ?? 'company-1',
    overrides.branchId ?? 'branch-1',
    overrides.pointOfSaleId ?? 'pos-1',
    overrides.voucherTypeId ?? 'voucher-type-fa-a',
    overrides.number ?? 1,
    overrides.partyId ?? 'party-1',
    overrides.warehouseId ?? null,
    overrides.issueDate ?? new Date(),
    overrides.currency ?? 'ARS',
    overrides.exchangeRate ?? '1',
    overrides.relatedVoucherId ?? null,
    overrides.subtotal ?? '1000.00',
    overrides.taxTotal ?? '210.00',
    overrides.total ?? '1210.00',
    overrides.cae ?? null,
    overrides.caeExpirationDate ?? null,
    overrides.createdByUserId ?? 'user-1',
    overrides.createdAt ?? new Date(),
    overrides.lines ?? [],
  );
}

function makePayment(overrides: Partial<PaymentEntity> = {}): PaymentEntity {
  return new PaymentEntity(
    overrides.id ?? 'payment-1',
    overrides.companyId ?? 'company-1',
    overrides.partyId ?? 'party-1',
    overrides.direction ?? 'COLLECTION',
    overrides.date ?? new Date(),
    overrides.currency ?? 'ARS',
    overrides.exchangeRate ?? '1',
    overrides.totalAmount ?? '1210.00',
    overrides.createdByUserId ?? 'user-1',
    overrides.createdAt ?? new Date(),
    overrides.allocations ?? [],
    overrides.methodDetails ?? [],
  );
}

function makeCashSession(overrides: Partial<CashSessionEntity> = {}): CashSessionEntity {
  return new CashSessionEntity(
    overrides.id ?? 'session-1',
    overrides.cashRegisterId ?? 'register-1',
    overrides.openedByUserId ?? 'user-1',
    overrides.openingBalance ?? '0.00',
    overrides.openedAt ?? new Date(),
    overrides.closedByUserId ?? null,
    overrides.closingBalance ?? null,
    overrides.expectedBalance ?? null,
    overrides.difference ?? null,
    overrides.closedAt ?? null,
  );
}

function makeBankAccount(overrides: Partial<BankAccountEntity> = {}): BankAccountEntity {
  return new BankAccountEntity(
    overrides.id ?? 'bank-account-1',
    overrides.companyId ?? 'company-1',
    overrides.bankName ?? 'Banco Nación',
    overrides.accountType ?? 'CHECKING',
    overrides.accountNumber ?? null,
    overrides.cbu ?? null,
    overrides.alias ?? null,
    overrides.currency ?? 'ARS',
    overrides.isActive ?? true,
    overrides.glAccountId ?? null,
  );
}

function makeCashRegister(overrides: Partial<CashRegisterEntity> = {}): CashRegisterEntity {
  return new CashRegisterEntity(
    overrides.id ?? 'register-1',
    overrides.companyId ?? 'company-1',
    overrides.branchId ?? 'branch-1',
    overrides.name ?? 'Caja Principal',
    overrides.isActive ?? true,
    overrides.accountId ?? null,
  );
}

describe('CreatePaymentUseCase', () => {
  function makeSut() {
    const paymentMethodRepository = {
      findById: jest.fn(),
      findAllActive: jest.fn(),
    } as jest.Mocked<PaymentMethodRepository>;
    const paymentRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAllByCompany: jest.fn(),
      sumAllocatedAmountForVoucher: jest.fn(),
    } as jest.Mocked<PaymentRepository>;
    const customerRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByPartyId: jest.fn(),
      findAllByCompany: jest.fn(),
      update: jest.fn(),
      setActive: jest.fn(),
    } as jest.Mocked<CustomerRepository>;
    const supplierRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByPartyId: jest.fn(),
      findAllByCompany: jest.fn(),
      update: jest.fn(),
      setActive: jest.fn(),
    } as jest.Mocked<SupplierRepository>;
    const voucherRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAllByCompany: jest.fn(),
    } as jest.Mocked<VoucherRepository>;
    const companyRepository = {
      create: jest.fn(),
      findAllForUser: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      setActive: jest.fn(),
    } as jest.Mocked<CompanyRepository>;
    const cashSessionRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findOpenByCashRegister: jest.fn(),
      findAllByCashRegister: jest.fn(),
      close: jest.fn(),
    } as jest.Mocked<CashSessionRepository>;
    const bankAccountRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAllByCompany: jest.fn(),
      update: jest.fn(),
      setActive: jest.fn(),
    } as jest.Mocked<BankAccountRepository>;
    const cashRegisterRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAllByBranch: jest.fn(),
      update: jest.fn(),
      setActive: jest.fn(),
    } as jest.Mocked<CashRegisterRepository>;
    const accountingSettingsRepository = {
      create: jest.fn(),
      findByCompany: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<AccountingSettingsRepository>;
    const companyPaymentMethodAccountRepository = {
      upsert: jest.fn(),
      find: jest.fn(),
      findAllByCompany: jest.fn(),
    } as jest.Mocked<CompanyPaymentMethodAccountRepository>;
    const applyJournalEntryService = {
      apply: jest.fn(),
    } as unknown as jest.Mocked<ApplyJournalEntryService>;
    const applyCustomerAccountMovementService = {
      apply: jest.fn(),
    } as unknown as jest.Mocked<ApplyCustomerAccountMovementService>;
    const applySupplierAccountMovementService = {
      apply: jest.fn(),
    } as unknown as jest.Mocked<ApplySupplierAccountMovementService>;
    const applyCashMovementService = {
      apply: jest.fn(),
    } as unknown as jest.Mocked<ApplyCashMovementService>;
    const applyBankMovementService = {
      apply: jest.fn(),
    } as unknown as jest.Mocked<ApplyBankMovementService>;
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;

    const useCase = new CreatePaymentUseCase(
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
      createFakeUnitOfWork(),
    );

    companyRepository.findById.mockResolvedValue(makeCompany());
    customerRepository.findByPartyId.mockResolvedValue(makeCustomer());
    supplierRepository.findByPartyId.mockResolvedValue(makeSupplier());
    paymentMethodRepository.findById.mockResolvedValue(makePaymentMethod());
    paymentRepository.sumAllocatedAmountForVoucher.mockResolvedValue('0');
    paymentRepository.create.mockResolvedValue(makePayment());
    voucherRepository.findById.mockResolvedValue(makeVoucher());
    cashSessionRepository.findById.mockResolvedValue(makeCashSession());
    cashRegisterRepository.findById.mockResolvedValue(makeCashRegister());
    bankAccountRepository.findById.mockResolvedValue(makeBankAccount());
    applyCustomerAccountMovementService.apply.mockResolvedValue(
      {} as CustomerAccountMovementEntity,
    );
    applySupplierAccountMovementService.apply.mockResolvedValue(
      {} as SupplierAccountMovementEntity,
    );
    applyCashMovementService.apply.mockResolvedValue({} as CashMovementEntity);
    applyBankMovementService.apply.mockResolvedValue({} as BankMovementEntity);

    return {
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
      useCase,
    };
  }

  const baseInput = {
    requestingUserId: 'user-1',
    requestingRoleName: 'Propietario',
    companyId: 'company-1',
    partyId: 'party-1',
    direction: 'COLLECTION' as const,
    methodDetails: [{ paymentMethodId: 'method-efectivo', amount: '1210' }],
    cashSessionId: 'session-1',
  };

  it('rechaza si el rol no autoriza', async () => {
    const { useCase } = makeSut();

    await expect(
      useCase.execute({ ...baseInput, requestingRoleName: 'Empleado' }),
    ).rejects.toThrow(RoleNotAuthorizedError);
  });

  it('rechaza si no hay medios de pago', async () => {
    const { useCase } = makeSut();

    await expect(useCase.execute({ ...baseInput, methodDetails: [] })).rejects.toThrow(
      EmptyPaymentMethodDetailsError,
    );
  });

  it('RN-PAY-01: rechaza si el cliente no está activo (COLLECTION)', async () => {
    const { useCase, customerRepository } = makeSut();
    customerRepository.findByPartyId.mockResolvedValue(makeCustomer({ isActive: false }));

    await expect(useCase.execute(baseInput)).rejects.toThrow(InvalidPaymentCounterpartyError);
  });

  it('RN-PAY-01: rechaza si el proveedor no está activo (PAYMENT)', async () => {
    const { useCase, supplierRepository } = makeSut();
    supplierRepository.findByPartyId.mockResolvedValue(makeSupplier({ isActive: false }));

    await expect(
      useCase.execute({ ...baseInput, direction: 'PAYMENT' }),
    ).rejects.toThrow(InvalidPaymentCounterpartyError);
  });

  it('rechaza si un medio de pago no existe o está inactivo', async () => {
    const { useCase, paymentMethodRepository } = makeSut();
    paymentMethodRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(InvalidPaymentMethodError);
  });

  it('RN-PAY-07: rechaza CHEQUE sin CheckDetail', async () => {
    const { useCase, paymentMethodRepository } = makeSut();
    paymentMethodRepository.findById.mockResolvedValue(
      makePaymentMethod({ id: 'method-cheque', code: 'CHEQUE', requiresCheckDetail: true }),
    );

    await expect(
      useCase.execute({
        ...baseInput,
        methodDetails: [{ paymentMethodId: 'method-cheque', amount: '1210' }],
      }),
    ).rejects.toThrow(MissingCheckDetailError);
  });

  it('cobro total de una factura: totalAmount se calcula sumando los medios, imputación 1 a 1', async () => {
    const { useCase, paymentRepository, applyCustomerAccountMovementService } = makeSut();

    await useCase.execute({
      ...baseInput,
      allocations: [{ voucherId: 'voucher-1', amountApplied: '1210' }],
    });

    const createCall = paymentRepository.create.mock.calls[0][0];
    expect(createCall.totalAmount).toBe('1210.00');
    expect(createCall.allocations).toEqual([
      expect.objectContaining({ voucherId: 'voucher-1', amountApplied: '1210.00' }),
    ]);
    expect(applyCustomerAccountMovementService.apply).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'customer-1', type: 'CREDIT', amount: '1210.00' }),
      expect.anything(),
    );
  });

  it('cobro parcial: queda saldo pendiente sin rechazo', async () => {
    const { useCase, paymentRepository, voucherRepository } = makeSut();
    voucherRepository.findById.mockResolvedValue(makeVoucher({ total: '1210.00' }));

    await useCase.execute({
      ...baseInput,
      methodDetails: [{ paymentMethodId: 'method-efectivo', amount: '500' }],
      allocations: [{ voucherId: 'voucher-1', amountApplied: '500' }],
    });

    const createCall = paymentRepository.create.mock.calls[0][0];
    expect(createCall.totalAmount).toBe('500.00');
  });

  it('cobro que cubre dos facturas a la vez', async () => {
    const { useCase, paymentRepository, voucherRepository } = makeSut();
    voucherRepository.findById.mockImplementation(async (id) =>
      makeVoucher({ id, total: '600.00' }),
    );

    await useCase.execute({
      ...baseInput,
      methodDetails: [{ paymentMethodId: 'method-efectivo', amount: '1200' }],
      allocations: [
        { voucherId: 'voucher-1', amountApplied: '600' },
        { voucherId: 'voucher-2', amountApplied: '600' },
      ],
    });

    const createCall = paymentRepository.create.mock.calls[0][0];
    expect(createCall.allocations).toHaveLength(2);
  });

  it('pago repartido entre Efectivo y Transferencia', async () => {
    const { useCase, paymentMethodRepository, paymentRepository } = makeSut();
    paymentMethodRepository.findById.mockImplementation(async (id) =>
      id === 'method-transferencia'
        ? makePaymentMethod({ id: 'method-transferencia', code: 'TRANSFERENCIA', requiresCashMovement: false, requiresBankMovement: true })
        : makePaymentMethod(),
    );

    await useCase.execute({
      ...baseInput,
      methodDetails: [
        { paymentMethodId: 'method-efectivo', amount: '500' },
        { paymentMethodId: 'method-transferencia', amount: '710' },
      ],
      bankAccountId: 'bank-account-1',
    });

    const createCall = paymentRepository.create.mock.calls[0][0];
    expect(createCall.totalAmount).toBe('1210.00');
    expect(createCall.methodDetails).toHaveLength(2);
  });

  it('RN-PAY-03: rechaza si la suma de imputaciones de este pago supera el monto total', async () => {
    const { useCase } = makeSut();

    await expect(
      useCase.execute({
        ...baseInput,
        methodDetails: [{ paymentMethodId: 'method-efectivo', amount: '500' }],
        allocations: [{ voucherId: 'voucher-1', amountApplied: '600' }],
      }),
    ).rejects.toThrow(AllocationExceedsPaymentAmountError);
  });

  it('RN-PAY-04: rechaza un comprobante de otra contraparte', async () => {
    const { useCase, voucherRepository } = makeSut();
    voucherRepository.findById.mockResolvedValue(makeVoucher({ partyId: 'otra-contraparte' }));

    await expect(
      useCase.execute({
        ...baseInput,
        allocations: [{ voucherId: 'voucher-1', amountApplied: '1210' }],
      }),
    ).rejects.toThrow(InvalidAllocationVoucherError);
  });

  it('RN-PAY-04: rechaza un comprobante inexistente', async () => {
    const { useCase, voucherRepository } = makeSut();
    voucherRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        ...baseInput,
        allocations: [{ voucherId: 'no-existe', amountApplied: '1210' }],
      }),
    ).rejects.toThrow(InvalidAllocationVoucherError);
  });

  it('RN-PAY-05: rechaza sobre-imputación acumulada entre pagos distintos', async () => {
    const { useCase, paymentRepository, voucherRepository } = makeSut();
    voucherRepository.findById.mockResolvedValue(makeVoucher({ total: '1000.00' }));
    paymentRepository.sumAllocatedAmountForVoucher.mockResolvedValue('600.00');

    await expect(
      useCase.execute({
        ...baseInput,
        methodDetails: [{ paymentMethodId: 'method-efectivo', amount: '500' }],
        allocations: [{ voucherId: 'voucher-1', amountApplied: '500' }],
      }),
    ).rejects.toThrow(VoucherOverpaidError);
  });

  it('RN-PAY-06/09: registra una única auditoría con metadata { direction, partyId, totalAmount }', async () => {
    const { useCase, auditLogRepository, paymentRepository } = makeSut();
    paymentRepository.create.mockResolvedValue(
      makePayment({ direction: 'COLLECTION', partyId: 'party-1', totalAmount: '1210.00' }),
    );

    await useCase.execute(baseInput);

    expect(auditLogRepository.record).toHaveBeenCalledTimes(1);
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'payment.create',
        metadata: { direction: 'COLLECTION', partyId: 'party-1', totalAmount: '1210.00' },
      }),
      expect.anything(),
    );
  });

  it('un PAYMENT (pago a proveedor) aplica un movimiento DEBIT en la cuenta del proveedor', async () => {
    const { useCase, applySupplierAccountMovementService, applyCustomerAccountMovementService } =
      makeSut();

    await useCase.execute({ ...baseInput, direction: 'PAYMENT' });

    expect(applySupplierAccountMovementService.apply).toHaveBeenCalledWith(
      expect.objectContaining({ supplierId: 'supplier-1', type: 'DEBIT', amount: '1210.00' }),
      expect.anything(),
    );
    expect(applyCustomerAccountMovementService.apply).not.toHaveBeenCalled();
  });

  it('RN-PAY-10: un cobro en efectivo genera un CashMovement IN ligado al Payment', async () => {
    const { useCase, applyCashMovementService, applyBankMovementService } = makeSut();

    await useCase.execute(baseInput);

    expect(applyCashMovementService.apply).toHaveBeenCalledWith(
      expect.objectContaining({
        cashSessionId: 'session-1',
        type: 'IN',
        amount: '1210.00',
        paymentId: 'payment-1',
      }),
      expect.anything(),
    );
    expect(applyBankMovementService.apply).not.toHaveBeenCalled();
  });

  it('RN-PAY-10: un pago en efectivo (PAYMENT) genera un CashMovement OUT', async () => {
    const { useCase, applyCashMovementService } = makeSut();

    await useCase.execute({ ...baseInput, direction: 'PAYMENT' });

    expect(applyCashMovementService.apply).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'OUT' }),
      expect.anything(),
    );
  });

  it('RN-PAY-10: rechaza un medio en efectivo sin cashSessionId', async () => {
    const { useCase } = makeSut();

    await expect(
      useCase.execute({ ...baseInput, cashSessionId: undefined }),
    ).rejects.toThrow(MissingCashSessionError);
  });

  it('RN-PAY-10: rechaza si la sesión de caja no está abierta', async () => {
    const { useCase, cashSessionRepository } = makeSut();
    cashSessionRepository.findById.mockResolvedValue(
      makeCashSession({ closedAt: new Date() }),
    );

    await expect(useCase.execute(baseInput)).rejects.toThrow(InvalidCashSessionError);
  });

  it('RN-PAY-10: rechaza si la sesión de caja no existe', async () => {
    const { useCase, cashSessionRepository } = makeSut();
    cashSessionRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(InvalidCashSessionError);
  });

  it('RN-PAY-10: una Transferencia genera un BankMovement DEPOSIT y exige bankAccountId', async () => {
    const {
      useCase,
      paymentMethodRepository,
      applyBankMovementService,
      applyCashMovementService,
    } = makeSut();
    paymentMethodRepository.findById.mockResolvedValue(
      makePaymentMethod({
        id: 'method-transferencia',
        code: 'TRANSFERENCIA',
        requiresCashMovement: false,
        requiresBankMovement: true,
      }),
    );

    await useCase.execute({
      ...baseInput,
      methodDetails: [{ paymentMethodId: 'method-transferencia', amount: '1210' }],
      cashSessionId: undefined,
      bankAccountId: 'bank-account-1',
    });

    expect(applyBankMovementService.apply).toHaveBeenCalledWith(
      expect.objectContaining({
        bankAccountId: 'bank-account-1',
        type: 'DEPOSIT',
        amount: '1210.00',
        paymentId: 'payment-1',
      }),
      expect.anything(),
    );
    expect(applyCashMovementService.apply).not.toHaveBeenCalled();
  });

  it('RN-PAY-10: rechaza una Transferencia sin bankAccountId', async () => {
    const { useCase, paymentMethodRepository } = makeSut();
    paymentMethodRepository.findById.mockResolvedValue(
      makePaymentMethod({
        id: 'method-transferencia',
        code: 'TRANSFERENCIA',
        requiresCashMovement: false,
        requiresBankMovement: true,
      }),
    );

    await expect(
      useCase.execute({
        ...baseInput,
        methodDetails: [{ paymentMethodId: 'method-transferencia', amount: '1210' }],
        cashSessionId: undefined,
      }),
    ).rejects.toThrow(MissingBankAccountError);
  });

  it('RN-PAY-10: rechaza si la cuenta bancaria no está activa', async () => {
    const { useCase, paymentMethodRepository, bankAccountRepository } = makeSut();
    paymentMethodRepository.findById.mockResolvedValue(
      makePaymentMethod({
        id: 'method-transferencia',
        code: 'TRANSFERENCIA',
        requiresCashMovement: false,
        requiresBankMovement: true,
      }),
    );
    bankAccountRepository.findById.mockResolvedValue(makeBankAccount({ isActive: false }));

    await expect(
      useCase.execute({
        ...baseInput,
        methodDetails: [{ paymentMethodId: 'method-transferencia', amount: '1210' }],
        cashSessionId: undefined,
        bankAccountId: 'bank-account-1',
      }),
    ).rejects.toThrow(InvalidBankAccountError);
  });

  it('un medio que no requiere caja ni banco (ej. Cheque) no genera CashMovement ni BankMovement', async () => {
    const { useCase, paymentMethodRepository, applyCashMovementService, applyBankMovementService } =
      makeSut();
    paymentMethodRepository.findById.mockResolvedValue(
      makePaymentMethod({
        id: 'method-cheque',
        code: 'CHEQUE',
        requiresCheckDetail: true,
        requiresCashMovement: false,
        requiresBankMovement: false,
      }),
    );

    await useCase.execute({
      ...baseInput,
      methodDetails: [
        {
          paymentMethodId: 'method-cheque',
          amount: '1210',
          checkDetail: { number: '123', bankName: 'Banco', dueDate: '2026-09-01' },
        },
      ],
      cashSessionId: undefined,
    });

    expect(applyCashMovementService.apply).not.toHaveBeenCalled();
    expect(applyBankMovementService.apply).not.toHaveBeenCalled();
  });

  describe('Sprint 4: asiento contable automático (§2.3)', () => {
    it('no genera ningún asiento si la empresa no activó Contabilidad', async () => {
      const { useCase, applyJournalEntryService } = makeSut();

      await useCase.execute(baseInput);

      expect(applyJournalEntryService.apply).not.toHaveBeenCalled();
    });

    it('un cobro en efectivo genera un asiento balanceado (Haber AR / Debe Caja)', async () => {
      const { useCase, accountingSettingsRepository, cashRegisterRepository, applyJournalEntryService } =
        makeSut();
      accountingSettingsRepository.findByCompany.mockResolvedValue(
        new AccountingSettingsEntity('company-1', 'ar-account', 'ap-account'),
      );
      cashRegisterRepository.findById.mockResolvedValue(
        makeCashRegister({ accountId: 'caja-account' }),
      );

      await useCase.execute(baseInput);

      expect(applyJournalEntryService.apply).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: 'PAYMENT',
          origin: 'AUTOMATIC',
          lines: [
            expect.objectContaining({ accountId: 'ar-account', debit: '0', credit: '1210.00' }),
            expect.objectContaining({ accountId: 'caja-account', debit: '1210.00', credit: '0' }),
          ],
        }),
        expect.anything(),
      );
    });

    it('RN-ACC-05: rechaza si la caja no tiene cuenta contable mapeada', async () => {
      const { useCase, accountingSettingsRepository, cashRegisterRepository } = makeSut();
      accountingSettingsRepository.findByCompany.mockResolvedValue(
        new AccountingSettingsEntity('company-1', 'ar-account', 'ap-account'),
      );
      cashRegisterRepository.findById.mockResolvedValue(makeCashRegister({ accountId: null }));

      await expect(useCase.execute(baseInput)).rejects.toThrow(
        MissingCashRegisterAccountMappingError,
      );
    });

    it('RN-ACC-05: rechaza una Transferencia sin la cuenta contable de la cuenta bancaria mapeada', async () => {
      const { useCase, accountingSettingsRepository, paymentMethodRepository, bankAccountRepository } =
        makeSut();
      accountingSettingsRepository.findByCompany.mockResolvedValue(
        new AccountingSettingsEntity('company-1', 'ar-account', 'ap-account'),
      );
      paymentMethodRepository.findById.mockResolvedValue(
        makePaymentMethod({
          id: 'method-transferencia',
          code: 'TRANSFERENCIA',
          requiresCashMovement: false,
          requiresBankMovement: true,
        }),
      );
      bankAccountRepository.findById.mockResolvedValue(makeBankAccount({ glAccountId: null }));

      await expect(
        useCase.execute({
          ...baseInput,
          methodDetails: [{ paymentMethodId: 'method-transferencia', amount: '1210' }],
          cashSessionId: undefined,
          bankAccountId: 'bank-account-1',
        }),
      ).rejects.toThrow(MissingBankAccountMappingError);
    });

    it('RN-ACC-05: rechaza un Cheque sin mapeo de cuenta para el sentido del cobro', async () => {
      const {
        useCase,
        accountingSettingsRepository,
        paymentMethodRepository,
        companyPaymentMethodAccountRepository,
      } = makeSut();
      accountingSettingsRepository.findByCompany.mockResolvedValue(
        new AccountingSettingsEntity('company-1', 'ar-account', 'ap-account'),
      );
      paymentMethodRepository.findById.mockResolvedValue(
        makePaymentMethod({
          id: 'method-cheque',
          code: 'CHEQUE',
          requiresCheckDetail: true,
          requiresCashMovement: false,
          requiresBankMovement: false,
        }),
      );
      companyPaymentMethodAccountRepository.find.mockResolvedValue(null);

      await expect(
        useCase.execute({
          ...baseInput,
          methodDetails: [
            {
              paymentMethodId: 'method-cheque',
              amount: '1210',
              checkDetail: { number: '123', bankName: 'Banco', dueDate: '2026-09-01' },
            },
          ],
          cashSessionId: undefined,
        }),
      ).rejects.toThrow(MissingPaymentMethodAccountMappingError);
    });

    it('un Cheque con mapeo configurado genera la línea de asiento con esa cuenta', async () => {
      const {
        useCase,
        accountingSettingsRepository,
        paymentMethodRepository,
        companyPaymentMethodAccountRepository,
        applyJournalEntryService,
      } = makeSut();
      accountingSettingsRepository.findByCompany.mockResolvedValue(
        new AccountingSettingsEntity('company-1', 'ar-account', 'ap-account'),
      );
      paymentMethodRepository.findById.mockResolvedValue(
        makePaymentMethod({
          id: 'method-cheque',
          code: 'CHEQUE',
          requiresCheckDetail: true,
          requiresCashMovement: false,
          requiresBankMovement: false,
        }),
      );
      companyPaymentMethodAccountRepository.find.mockResolvedValue(
        new CompanyPaymentMethodAccountEntity(
          'company-1',
          'method-cheque',
          'COLLECTION',
          'valores-a-depositar',
        ),
      );

      await useCase.execute({
        ...baseInput,
        methodDetails: [
          {
            paymentMethodId: 'method-cheque',
            amount: '1210',
            checkDetail: { number: '123', bankName: 'Banco', dueDate: '2026-09-01' },
          },
        ],
        cashSessionId: undefined,
      });

      expect(applyJournalEntryService.apply).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: [
            expect.objectContaining({ accountId: 'ar-account', debit: '0', credit: '1210.00' }),
            expect.objectContaining({ accountId: 'valores-a-depositar', debit: '1210.00', credit: '0' }),
          ],
        }),
        expect.anything(),
      );
    });
  });
});
