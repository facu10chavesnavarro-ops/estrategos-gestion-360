import { CreateVoucherUseCase } from '../../src/modules/vouchers/application/use-cases/create-voucher.use-case';
import { VoucherTypeRepository } from '../../src/modules/vouchers/domain/repositories/voucher-type.repository';
import { VoucherTypeEntity } from '../../src/modules/vouchers/domain/entities/voucher-type.entity';
import { PointOfSaleRepository } from '../../src/modules/vouchers/domain/repositories/point-of-sale.repository';
import { PointOfSaleEntity } from '../../src/modules/vouchers/domain/entities/point-of-sale.entity';
import { VoucherCounterRepository } from '../../src/modules/vouchers/domain/repositories/voucher-counter.repository';
import { VoucherRepository } from '../../src/modules/vouchers/domain/repositories/voucher.repository';
import { VoucherEntity, VoucherLineEntity } from '../../src/modules/vouchers/domain/entities/voucher.entity';
import { CustomerRepository } from '../../src/modules/customers/domain/repositories/customer.repository';
import { CustomerEntity } from '../../src/modules/customers/domain/entities/customer.entity';
import { SupplierRepository } from '../../src/modules/suppliers/domain/repositories/supplier.repository';
import { SupplierEntity } from '../../src/modules/suppliers/domain/entities/supplier.entity';
import { ItemRepository } from '../../src/modules/catalog/domain/repositories/item.repository';
import { ItemEntity } from '../../src/modules/catalog/domain/entities/item.entity';
import { TaxRepository } from '../../src/modules/catalog/domain/repositories/tax.repository';
import { TaxEntity } from '../../src/modules/catalog/domain/entities/tax.entity';
import { CompanyRepository } from '../../src/modules/companies/domain/repositories/company.repository';
import { CompanyEntity } from '../../src/modules/companies/domain/entities/company.entity';
import { ApplyStockMovementService } from '../../src/modules/inventory/application/services/apply-stock-movement.service';
import { StockMovementEntity } from '../../src/modules/inventory/domain/entities/stock-movement.entity';
import { ApplyCustomerAccountMovementService } from '../../src/modules/treasury/application/services/apply-customer-account-movement.service';
import { ApplySupplierAccountMovementService } from '../../src/modules/treasury/application/services/apply-supplier-account-movement.service';
import { CustomerAccountMovementEntity } from '../../src/modules/treasury/domain/entities/customer-account.entity';
import { SupplierAccountMovementEntity } from '../../src/modules/treasury/domain/entities/supplier-account.entity';
import { CategoryRepository } from '../../src/modules/catalog/domain/repositories/category.repository';
import { CategoryEntity } from '../../src/modules/catalog/domain/entities/category.entity';
import { AccountingSettingsRepository } from '../../src/modules/accounting/domain/repositories/accounting-settings.repository';
import { AccountingSettingsEntity } from '../../src/modules/accounting/domain/entities/accounting-settings.entity';
import { ApplyJournalEntryService } from '../../src/modules/accounting/application/services/apply-journal-entry.service';
import {
  MissingCategoryAccountMappingError,
  MissingTaxAccountMappingError,
} from '../../src/modules/accounting/domain/errors/accounting.errors';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import { InsufficientStockError } from '../../src/modules/inventory/domain/errors/stock-movement.errors';
import {
  VoucherTypeNotFoundError,
  InvalidCounterpartyError,
  MissingRelatedVoucherError,
  InvalidRelatedVoucherError,
  MissingWarehouseError,
  EmptyVoucherLinesError,
  InvalidVoucherLineItemError,
} from '../../src/modules/vouchers/domain/errors/voucher.errors';
import { createFakeUnitOfWork } from '../support/fake-unit-of-work';

function makeVoucherType(overrides: Partial<VoucherTypeEntity> = {}): VoucherTypeEntity {
  return new VoucherTypeEntity(
    overrides.id ?? 'voucher-type-fa-a',
    overrides.code ?? 'FA_A',
    overrides.name ?? 'Factura A',
    overrides.flow ?? 'SALE',
    overrides.affectsStock ?? 'OUT',
    overrides.affectsCurrentAccount ?? 'DEBIT',
    overrides.requiresCae ?? true,
    overrides.isCreditNote ?? false,
    overrides.relatedVoucherRequired ?? false,
    overrides.isActive ?? true,
  );
}

function makePointOfSale(overrides: Partial<PointOfSaleEntity> = {}): PointOfSaleEntity {
  return new PointOfSaleEntity(
    overrides.id ?? 'pos-1',
    overrides.companyId ?? 'company-1',
    overrides.branchId ?? 'branch-1',
    overrides.code ?? '0001',
    overrides.name ?? 'Casa Central',
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

function makeItem(overrides: Partial<ItemEntity> = {}): ItemEntity {
  return new ItemEntity(
    overrides.id ?? 'item-1',
    overrides.companyId ?? 'company-1',
    overrides.type ?? 'PRODUCT',
    overrides.sku ?? 'SKU-1',
    overrides.name ?? 'Resma A4',
    overrides.description ?? null,
    overrides.categoryId ?? null,
    overrides.unitOfMeasure ?? 'unidad',
    overrides.tracksStock ?? true,
    overrides.minimumStock ?? null,
    overrides.isActive ?? true,
    overrides.taxIds ?? [],
  );
}

function makeTax(overrides: Partial<TaxEntity> = {}): TaxEntity {
  return new TaxEntity(
    overrides.id ?? 'tax-1',
    overrides.companyId ?? 'company-1',
    overrides.name ?? 'IVA 21%',
    overrides.type ?? 'VAT',
    overrides.rate ?? '21',
    overrides.validFrom ?? new Date('2020-01-01'),
    overrides.validTo ?? null,
    overrides.salesAccountId ?? null,
    overrides.purchasesAccountId ?? null,
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

function makeVoucherLine(overrides: Partial<VoucherLineEntity> = {}): VoucherLineEntity {
  return new VoucherLineEntity(
    overrides.id ?? 'line-1',
    overrides.lineNumber ?? 1,
    overrides.itemId ?? 'item-1',
    overrides.description ?? 'Resma A4',
    overrides.quantity ?? '10.000',
    overrides.unitPrice ?? '100.0000',
    overrides.discountPercentage ?? '0.00',
    overrides.subtotal ?? '1000.00',
    overrides.taxes ?? [],
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
    overrides.warehouseId ?? 'warehouse-1',
    overrides.issueDate ?? new Date(),
    overrides.currency ?? 'ARS',
    overrides.exchangeRate ?? '1.0000',
    overrides.relatedVoucherId ?? null,
    overrides.subtotal ?? '1000.00',
    overrides.taxTotal ?? '210.00',
    overrides.total ?? '1210.00',
    overrides.cae ?? null,
    overrides.caeExpirationDate ?? null,
    overrides.createdByUserId ?? 'user-1',
    overrides.createdAt ?? new Date(),
    overrides.lines ?? [makeVoucherLine()],
  );
}

function makeCategory(overrides: Partial<CategoryEntity> = {}): CategoryEntity {
  return new CategoryEntity(
    overrides.id ?? 'category-1',
    overrides.companyId ?? 'company-1',
    overrides.parentId ?? null,
    overrides.name ?? 'Servicios',
    overrides.isActive ?? true,
    overrides.salesAccountId ?? null,
    overrides.purchasesAccountId ?? null,
  );
}

function makeStockMovement(overrides: Partial<StockMovementEntity> = {}): StockMovementEntity {
  return new StockMovementEntity(
    overrides.id ?? 'movement-1',
    overrides.companyId ?? 'company-1',
    overrides.itemId ?? 'item-1',
    overrides.warehouseId ?? 'warehouse-1',
    overrides.type ?? 'SALE_OUT',
    overrides.quantity ?? '10.000',
    overrides.unitCost ?? '100.0000',
    overrides.reason ?? null,
    overrides.transferGroupId ?? null,
    overrides.voucherId ?? 'voucher-1',
    overrides.userId ?? 'user-1',
    overrides.createdAt ?? new Date(),
  );
}

describe('CreateVoucherUseCase', () => {
  function makeSut() {
    const voucherTypeRepository = {
      findById: jest.fn(),
      findByCode: jest.fn(),
      findAllActive: jest.fn(),
    } as jest.Mocked<VoucherTypeRepository>;
    const pointOfSaleRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCompanyAndCode: jest.fn(),
      findAllByBranch: jest.fn(),
      update: jest.fn(),
      setActive: jest.fn(),
    } as jest.Mocked<PointOfSaleRepository>;
    const voucherCounterRepository = {
      getNextNumber: jest.fn(),
    } as jest.Mocked<VoucherCounterRepository>;
    const voucherRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAllByCompany: jest.fn(),
    } as jest.Mocked<VoucherRepository>;
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
    const itemRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySku: jest.fn(),
      findAllByCompany: jest.fn(),
      update: jest.fn(),
      setActive: jest.fn(),
    } as jest.Mocked<ItemRepository>;
    const taxRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAllByCompany: jest.fn(),
      updateName: jest.fn(),
      updateAccounts: jest.fn(),
      close: jest.fn(),
    } as jest.Mocked<TaxRepository>;
    const categoryRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAllByCompany: jest.fn(),
      update: jest.fn(),
      setActive: jest.fn(),
    } as jest.Mocked<CategoryRepository>;
    const accountingSettingsRepository = {
      create: jest.fn(),
      findByCompany: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<AccountingSettingsRepository>;
    const applyJournalEntryService = {
      apply: jest.fn(),
    } as unknown as jest.Mocked<ApplyJournalEntryService>;
    const companyRepository = {
      create: jest.fn(),
      findAllForUser: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      setActive: jest.fn(),
    } as jest.Mocked<CompanyRepository>;
    const applyStockMovementService = {
      apply: jest.fn(),
    } as unknown as jest.Mocked<ApplyStockMovementService>;
    const applyCustomerAccountMovementService = {
      apply: jest.fn(),
    } as unknown as jest.Mocked<ApplyCustomerAccountMovementService>;
    const applySupplierAccountMovementService = {
      apply: jest.fn(),
    } as unknown as jest.Mocked<ApplySupplierAccountMovementService>;
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;

    const useCase = new CreateVoucherUseCase(
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
      createFakeUnitOfWork(),
    );

    voucherTypeRepository.findById.mockResolvedValue(makeVoucherType());
    pointOfSaleRepository.findById.mockResolvedValue(makePointOfSale());
    companyRepository.findById.mockResolvedValue(makeCompany());
    customerRepository.findByPartyId.mockResolvedValue(makeCustomer());
    applyCustomerAccountMovementService.apply.mockResolvedValue(
      {} as CustomerAccountMovementEntity,
    );
    applySupplierAccountMovementService.apply.mockResolvedValue(
      {} as SupplierAccountMovementEntity,
    );
    supplierRepository.findByPartyId.mockResolvedValue(makeSupplier());
    itemRepository.findById.mockResolvedValue(makeItem());
    taxRepository.findById.mockResolvedValue(null);
    voucherCounterRepository.getNextNumber.mockResolvedValue(1);
    voucherRepository.create.mockResolvedValue(makeVoucher());
    applyStockMovementService.apply.mockResolvedValue(makeStockMovement());

    return {
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
      useCase,
    };
  }

  const baseInput = {
    requestingUserId: 'user-1',
    requestingRoleName: 'Propietario',
    companyId: 'company-1',
    branchId: 'branch-1',
    pointOfSaleId: 'pos-1',
    voucherTypeId: 'voucher-type-fa-a',
    partyId: 'party-1',
    warehouseId: 'warehouse-1',
    lines: [
      {
        itemId: 'item-1',
        description: 'Resma A4',
        quantity: '10',
        unitPrice: '100',
      },
    ],
  };

  it('rechaza si el rol no autoriza', async () => {
    const { useCase } = makeSut();

    await expect(
      useCase.execute({ ...baseInput, requestingRoleName: 'Empleado' }),
    ).rejects.toThrow(RoleNotAuthorizedError);
  });

  it('rechaza si el tipo de comprobante no existe o está inactivo', async () => {
    const { useCase, voucherTypeRepository } = makeSut();
    voucherTypeRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(VoucherTypeNotFoundError);
  });

  it('rechaza si no hay líneas', async () => {
    const { useCase } = makeSut();

    await expect(useCase.execute({ ...baseInput, lines: [] })).rejects.toThrow(
      EmptyVoucherLinesError,
    );
  });

  it('rechaza si un ítem de una línea no existe', async () => {
    const { useCase, itemRepository } = makeSut();
    itemRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(InvalidVoucherLineItemError);
  });

  it('RN-VOU-04: rechaza si el cliente no está activo (flow SALE)', async () => {
    const { useCase, customerRepository } = makeSut();
    customerRepository.findByPartyId.mockResolvedValue(makeCustomer({ isActive: false }));

    await expect(useCase.execute(baseInput)).rejects.toThrow(InvalidCounterpartyError);
  });

  it('RN-VOU-04: rechaza si el proveedor no está activo (flow PURCHASE)', async () => {
    const { useCase, voucherTypeRepository, supplierRepository } = makeSut();
    voucherTypeRepository.findById.mockResolvedValue(
      makeVoucherType({ id: 'voucher-type-fc', code: 'FC', flow: 'PURCHASE', affectsStock: 'IN' }),
    );
    supplierRepository.findByPartyId.mockResolvedValue(makeSupplier({ isActive: false }));

    await expect(
      useCase.execute({ ...baseInput, voucherTypeId: 'voucher-type-fc' }),
    ).rejects.toThrow(InvalidCounterpartyError);
  });

  it('RN-VOU-07: rechaza si falta warehouseId con líneas que trackean stock', async () => {
    const { useCase } = makeSut();

    await expect(
      useCase.execute({ ...baseInput, warehouseId: undefined }),
    ).rejects.toThrow(MissingWarehouseError);
  });

  it('Factura de Venta: descuenta stock (SALE_OUT), snapshot de impuestos y número asignado', async () => {
    const {
      useCase,
      taxRepository,
      itemRepository,
      voucherCounterRepository,
      applyStockMovementService,
      voucherRepository,
    } = makeSut();
    itemRepository.findById.mockResolvedValue(makeItem({ taxIds: ['tax-1'] }));
    taxRepository.findById.mockResolvedValue(makeTax({ rate: '21' }));
    voucherCounterRepository.getNextNumber.mockResolvedValue(7);

    await useCase.execute(baseInput);

    expect(voucherCounterRepository.getNextNumber).toHaveBeenCalledWith(
      'company-1',
      'pos-1',
      'voucher-type-fa-a',
      expect.anything(),
    );
    const createCall = voucherRepository.create.mock.calls[0][0];
    expect(createCall.number).toBe(7);
    expect(createCall.subtotal).toBe('1000.00');
    expect(createCall.taxTotal).toBe('210.00');
    expect(createCall.total).toBe('1210.00');
    expect(createCall.lines[0].taxes).toEqual([{ taxId: 'tax-1', rate: '21.0000', amount: '210.00' }]);

    expect(applyStockMovementService.apply).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: 'item-1',
        warehouseId: 'warehouse-1',
        direction: 'OUT',
        type: 'SALE_OUT',
        quantity: '10.000',
        voucherId: 'voucher-1',
      }),
      expect.anything(),
    );
  });

  it('Factura de Compra: ingresa stock (PURCHASE_IN)', async () => {
    const { useCase, voucherTypeRepository, applyStockMovementService } = makeSut();
    voucherTypeRepository.findById.mockResolvedValue(
      makeVoucherType({
        id: 'voucher-type-fc',
        code: 'FC',
        flow: 'PURCHASE',
        affectsStock: 'IN',
        affectsCurrentAccount: 'CREDIT',
      }),
    );

    await useCase.execute({ ...baseInput, voucherTypeId: 'voucher-type-fc' });

    expect(applyStockMovementService.apply).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'IN',
        type: 'PURCHASE_IN',
        unitCost: '100.0000',
      }),
      expect.anything(),
    );
  });

  it('RN-CTA-04: Factura de Venta (affectsCurrentAccount = DEBIT) aumenta la cuenta corriente del cliente', async () => {
    const { useCase, voucherRepository, applyCustomerAccountMovementService, applySupplierAccountMovementService } =
      makeSut();
    voucherRepository.create.mockResolvedValue(makeVoucher({ total: '1210.00' }));

    await useCase.execute(baseInput);

    expect(applyCustomerAccountMovementService.apply).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        customerId: 'customer-1',
        type: 'DEBIT',
        amount: '1210.00',
        voucherId: 'voucher-1',
      }),
      expect.anything(),
    );
    expect(applySupplierAccountMovementService.apply).not.toHaveBeenCalled();
  });

  it('RN-CTA-04: Factura de Compra (affectsCurrentAccount = CREDIT) disminuye la cuenta corriente del proveedor', async () => {
    const { useCase, voucherTypeRepository, voucherRepository, applySupplierAccountMovementService, applyCustomerAccountMovementService } =
      makeSut();
    voucherTypeRepository.findById.mockResolvedValue(
      makeVoucherType({
        id: 'voucher-type-fc',
        code: 'FC',
        flow: 'PURCHASE',
        affectsStock: 'IN',
        affectsCurrentAccount: 'CREDIT',
      }),
    );
    voucherRepository.create.mockResolvedValue(makeVoucher({ total: '1800.00' }));

    await useCase.execute({ ...baseInput, voucherTypeId: 'voucher-type-fc' });

    expect(applySupplierAccountMovementService.apply).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        supplierId: 'supplier-1',
        type: 'CREDIT',
        amount: '1800.00',
        voucherId: 'voucher-1',
      }),
      expect.anything(),
    );
    expect(applyCustomerAccountMovementService.apply).not.toHaveBeenCalled();
  });

  it('Nota de Crédito: exige relatedVoucherId (RN-VOU-08)', async () => {
    const { useCase, voucherTypeRepository } = makeSut();
    voucherTypeRepository.findById.mockResolvedValue(
      makeVoucherType({
        id: 'voucher-type-nc-a',
        code: 'NC_A',
        isCreditNote: true,
        relatedVoucherRequired: true,
        affectsStock: 'IN',
        affectsCurrentAccount: 'CREDIT',
      }),
    );

    await expect(
      useCase.execute({ ...baseInput, voucherTypeId: 'voucher-type-nc-a' }),
    ).rejects.toThrow(MissingRelatedVoucherError);
  });

  it('Nota de Crédito: rechaza un relatedVoucherId de otra contraparte', async () => {
    const { useCase, voucherTypeRepository, voucherRepository } = makeSut();
    voucherTypeRepository.findById.mockResolvedValue(
      makeVoucherType({
        id: 'voucher-type-nc-a',
        code: 'NC_A',
        isCreditNote: true,
        relatedVoucherRequired: true,
        affectsStock: 'IN',
        affectsCurrentAccount: 'CREDIT',
      }),
    );
    voucherRepository.findById.mockResolvedValue(makeVoucher({ partyId: 'otra-contraparte' }));

    await expect(
      useCase.execute({
        ...baseInput,
        voucherTypeId: 'voucher-type-nc-a',
        relatedVoucherId: 'voucher-original',
      }),
    ).rejects.toThrow(InvalidRelatedVoucherError);
  });

  it('Nota de Crédito: revierte la dirección del efecto de stock (RETURN_IN) y de cuenta corriente (CREDIT)', async () => {
    const {
      useCase,
      voucherTypeRepository,
      voucherRepository,
      applyStockMovementService,
      applyCustomerAccountMovementService,
    } = makeSut();
    voucherTypeRepository.findById.mockResolvedValue(
      makeVoucherType({
        id: 'voucher-type-nc-a',
        code: 'NC_A',
        isCreditNote: true,
        relatedVoucherRequired: true,
        affectsStock: 'IN',
        affectsCurrentAccount: 'CREDIT',
      }),
    );
    voucherRepository.findById.mockResolvedValue(makeVoucher({ partyId: 'party-1' }));
    voucherRepository.create.mockResolvedValue(
      makeVoucher({ id: 'voucher-nc-1', total: '1000.00' }),
    );

    await useCase.execute({
      ...baseInput,
      voucherTypeId: 'voucher-type-nc-a',
      relatedVoucherId: 'voucher-original',
    });

    expect(applyStockMovementService.apply).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'IN', type: 'RETURN_IN' }),
      expect.anything(),
    );
    expect(applyCustomerAccountMovementService.apply).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'customer-1',
        type: 'CREDIT',
        amount: '1000.00',
        voucherId: 'voucher-nc-1',
      }),
      expect.anything(),
    );
  });

  it('propaga RN-STK-06 (stock insuficiente) desde ApplyStockMovementService', async () => {
    const { useCase, applyStockMovementService } = makeSut();
    applyStockMovementService.apply.mockRejectedValue(new InsufficientStockError());

    await expect(useCase.execute(baseInput)).rejects.toThrow(InsufficientStockError);
  });

  it('registra una única auditoría con metadata { voucherTypeId, number, total }', async () => {
    const { useCase, auditLogRepository, voucherRepository } = makeSut();
    voucherRepository.create.mockResolvedValue(
      makeVoucher({ number: 3, total: '1210.00', voucherTypeId: 'voucher-type-fa-a' }),
    );

    await useCase.execute(baseInput);

    expect(auditLogRepository.record).toHaveBeenCalledTimes(1);
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'voucher.create',
        metadata: { voucherTypeId: 'voucher-type-fa-a', number: 3, total: '1210.00' },
      }),
      expect.anything(),
    );
  });

  describe('Sprint 4: asiento contable automático (§2.3)', () => {
    it('no genera ningún asiento si la empresa no activó Contabilidad', async () => {
      const { useCase, applyJournalEntryService } = makeSut();

      await useCase.execute(baseInput);

      expect(applyJournalEntryService.apply).not.toHaveBeenCalled();
    });

    it('genera un asiento balanceado cuando Contabilidad está activa y la categoría está mapeada', async () => {
      const { useCase, accountingSettingsRepository, categoryRepository, itemRepository, applyJournalEntryService } =
        makeSut();
      accountingSettingsRepository.findByCompany.mockResolvedValue(
        new AccountingSettingsEntity('company-1', 'ar-account', 'ap-account'),
      );
      itemRepository.findById.mockResolvedValue(makeItem({ categoryId: 'category-1' }));
      categoryRepository.findById.mockResolvedValue(
        makeCategory({ id: 'category-1', salesAccountId: 'sales-account' }),
      );

      await useCase.execute(baseInput);

      expect(applyJournalEntryService.apply).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: 'VOUCHER',
          origin: 'AUTOMATIC',
          lines: [
            expect.objectContaining({ accountId: 'ar-account', debit: '1000.00', credit: '0' }),
            expect.objectContaining({ accountId: 'sales-account', debit: '0', credit: '1000.00' }),
          ],
        }),
        expect.anything(),
      );
    });

    it('RN-ACC-05: rechaza si la categoría del ítem no tiene cuenta de ventas mapeada', async () => {
      const { useCase, accountingSettingsRepository, categoryRepository, itemRepository } = makeSut();
      accountingSettingsRepository.findByCompany.mockResolvedValue(
        new AccountingSettingsEntity('company-1', 'ar-account', 'ap-account'),
      );
      itemRepository.findById.mockResolvedValue(makeItem({ categoryId: 'category-1' }));
      categoryRepository.findById.mockResolvedValue(
        makeCategory({ id: 'category-1', salesAccountId: null }),
      );

      await expect(useCase.execute(baseInput)).rejects.toThrow(
        MissingCategoryAccountMappingError,
      );
    });

    it('RN-ACC-05: rechaza un impuesto sin cuenta mapeada', async () => {
      const { useCase, accountingSettingsRepository, categoryRepository, itemRepository, taxRepository } =
        makeSut();
      accountingSettingsRepository.findByCompany.mockResolvedValue(
        new AccountingSettingsEntity('company-1', 'ar-account', 'ap-account'),
      );
      itemRepository.findById.mockResolvedValue(
        makeItem({ categoryId: 'category-1', taxIds: ['tax-1'] }),
      );
      categoryRepository.findById.mockResolvedValue(
        makeCategory({ id: 'category-1', salesAccountId: 'sales-account' }),
      );
      taxRepository.findById.mockResolvedValue(
        new TaxEntity('tax-1', 'company-1', 'IVA 21%', 'VAT', '21', new Date('2020-01-01'), null, null, null),
      );

      await expect(useCase.execute(baseInput)).rejects.toThrow(MissingTaxAccountMappingError);
    });
  });
});
