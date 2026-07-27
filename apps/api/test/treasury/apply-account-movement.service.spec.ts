import { ApplyCustomerAccountMovementService } from '../../src/modules/treasury/application/services/apply-customer-account-movement.service';
import { ApplySupplierAccountMovementService } from '../../src/modules/treasury/application/services/apply-supplier-account-movement.service';
import {
  CustomerAccountRepository,
  CustomerAccountMovementRepository,
} from '../../src/modules/treasury/domain/repositories/customer-account.repository';
import {
  SupplierAccountRepository,
  SupplierAccountMovementRepository,
} from '../../src/modules/treasury/domain/repositories/supplier-account.repository';
import { CustomerAccountEntity, CustomerAccountMovementEntity } from '../../src/modules/treasury/domain/entities/customer-account.entity';
import { SupplierAccountEntity, SupplierAccountMovementEntity } from '../../src/modules/treasury/domain/entities/supplier-account.entity';
import { FAKE_TRANSACTION_CONTEXT } from '../support/fake-unit-of-work';

function makeCustomerAccount(overrides: Partial<CustomerAccountEntity> = {}): CustomerAccountEntity {
  return new CustomerAccountEntity(
    overrides.id ?? 'account-1',
    overrides.companyId ?? 'company-1',
    overrides.customerId ?? 'customer-1',
    overrides.currentBalance ?? '0.00',
  );
}

function makeCustomerAccountMovement(
  overrides: Partial<CustomerAccountMovementEntity> = {},
): CustomerAccountMovementEntity {
  return new CustomerAccountMovementEntity(
    overrides.id ?? 'movement-1',
    overrides.customerAccountId ?? 'account-1',
    overrides.type ?? 'DEBIT',
    overrides.amount ?? '100.00',
    overrides.balanceAfter ?? '100.00',
    overrides.voucherId ?? null,
    overrides.paymentId ?? null,
    overrides.createdAt ?? new Date(),
  );
}

function makeSupplierAccount(overrides: Partial<SupplierAccountEntity> = {}): SupplierAccountEntity {
  return new SupplierAccountEntity(
    overrides.id ?? 'account-1',
    overrides.companyId ?? 'company-1',
    overrides.supplierId ?? 'supplier-1',
    overrides.currentBalance ?? '0.00',
  );
}

function makeSupplierAccountMovement(
  overrides: Partial<SupplierAccountMovementEntity> = {},
): SupplierAccountMovementEntity {
  return new SupplierAccountMovementEntity(
    overrides.id ?? 'movement-1',
    overrides.supplierAccountId ?? 'account-1',
    overrides.type ?? 'DEBIT',
    overrides.amount ?? '100.00',
    overrides.balanceAfter ?? '100.00',
    overrides.voucherId ?? null,
    overrides.paymentId ?? null,
    overrides.createdAt ?? new Date(),
  );
}

describe('ApplyCustomerAccountMovementService', () => {
  function makeSut() {
    const customerAccountRepository = {
      findByCustomerId: jest.fn(),
      upsert: jest.fn(),
    } as jest.Mocked<CustomerAccountRepository>;
    const customerAccountMovementRepository = {
      create: jest.fn(),
      findAllByAccount: jest.fn(),
    } as jest.Mocked<CustomerAccountMovementRepository>;
    const service = new ApplyCustomerAccountMovementService(
      customerAccountRepository,
      customerAccountMovementRepository,
    );
    customerAccountMovementRepository.create.mockResolvedValue(makeCustomerAccountMovement());
    return { customerAccountRepository, customerAccountMovementRepository, service };
  }

  it('primer movimiento: crea la cuenta en 0 y aplica DEBIT (sube el saldo)', async () => {
    const { service, customerAccountRepository, customerAccountMovementRepository } = makeSut();
    customerAccountRepository.findByCustomerId.mockResolvedValue(null);
    customerAccountRepository.upsert.mockResolvedValue(makeCustomerAccount({ currentBalance: '100.00' }));

    await service.apply(
      {
        companyId: 'company-1',
        customerId: 'customer-1',
        type: 'DEBIT',
        amount: '100',
        voucherId: 'voucher-1',
      },
      FAKE_TRANSACTION_CONTEXT,
    );

    expect(customerAccountRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'customer-1', currentBalance: '100.00' }),
      expect.anything(),
    );
    expect(customerAccountMovementRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'DEBIT',
        amount: '100.00',
        balanceAfter: '100.00',
        voucherId: 'voucher-1',
      }),
      expect.anything(),
    );
  });

  it('movimiento CREDIT sobre saldo existente lo disminuye', async () => {
    const { service, customerAccountRepository, customerAccountMovementRepository } = makeSut();
    customerAccountRepository.findByCustomerId.mockResolvedValue(
      makeCustomerAccount({ currentBalance: '1000.00' }),
    );
    customerAccountRepository.upsert.mockResolvedValue(makeCustomerAccount({ currentBalance: '700.00' }));

    await service.apply(
      {
        companyId: 'company-1',
        customerId: 'customer-1',
        type: 'CREDIT',
        amount: '300',
        paymentId: 'payment-1',
      },
      FAKE_TRANSACTION_CONTEXT,
    );

    expect(customerAccountRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ currentBalance: '700.00' }),
      expect.anything(),
    );
    expect(customerAccountMovementRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CREDIT', amount: '300.00', balanceAfter: '700.00' }),
      expect.anything(),
    );
  });

  it('permite saldo negativo (a favor del cliente) sin bloquear', async () => {
    const { service, customerAccountRepository } = makeSut();
    customerAccountRepository.findByCustomerId.mockResolvedValue(
      makeCustomerAccount({ currentBalance: '100.00' }),
    );
    customerAccountRepository.upsert.mockResolvedValue(
      makeCustomerAccount({ currentBalance: '-200.00' }),
    );

    await service.apply(
      { companyId: 'company-1', customerId: 'customer-1', type: 'CREDIT', amount: '300' },
      FAKE_TRANSACTION_CONTEXT,
    );

    expect(customerAccountRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ currentBalance: '-200.00' }),
      expect.anything(),
    );
  });
});

describe('ApplySupplierAccountMovementService', () => {
  function makeSut() {
    const supplierAccountRepository = {
      findBySupplierId: jest.fn(),
      upsert: jest.fn(),
    } as jest.Mocked<SupplierAccountRepository>;
    const supplierAccountMovementRepository = {
      create: jest.fn(),
      findAllByAccount: jest.fn(),
    } as jest.Mocked<SupplierAccountMovementRepository>;
    const service = new ApplySupplierAccountMovementService(
      supplierAccountRepository,
      supplierAccountMovementRepository,
    );
    supplierAccountMovementRepository.create.mockResolvedValue(makeSupplierAccountMovement());
    return { supplierAccountRepository, supplierAccountMovementRepository, service };
  }

  it('primer movimiento: crea la cuenta en 0 y aplica CREDIT (baja el saldo — le debemos más)', async () => {
    const { service, supplierAccountRepository } = makeSut();
    supplierAccountRepository.findBySupplierId.mockResolvedValue(null);
    supplierAccountRepository.upsert.mockResolvedValue(
      makeSupplierAccount({ currentBalance: '-1800.00' }),
    );

    await service.apply(
      {
        companyId: 'company-1',
        supplierId: 'supplier-1',
        type: 'CREDIT',
        amount: '1800',
        voucherId: 'voucher-1',
      },
      FAKE_TRANSACTION_CONTEXT,
    );

    expect(supplierAccountRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ supplierId: 'supplier-1', currentBalance: '-1800.00' }),
      expect.anything(),
    );
  });

  it('movimiento DEBIT (un pago al proveedor) reduce la deuda hacia cero', async () => {
    const { service, supplierAccountRepository } = makeSut();
    supplierAccountRepository.findBySupplierId.mockResolvedValue(
      makeSupplierAccount({ currentBalance: '-1800.00' }),
    );
    supplierAccountRepository.upsert.mockResolvedValue(
      makeSupplierAccount({ currentBalance: '-800.00' }),
    );

    await service.apply(
      {
        companyId: 'company-1',
        supplierId: 'supplier-1',
        type: 'DEBIT',
        amount: '1000',
        paymentId: 'payment-1',
      },
      FAKE_TRANSACTION_CONTEXT,
    );

    expect(supplierAccountRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ currentBalance: '-800.00' }),
      expect.anything(),
    );
  });
});
