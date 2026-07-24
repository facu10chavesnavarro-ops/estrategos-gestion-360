import { CreateCustomerUseCase } from '../../src/modules/customers/application/use-cases/create-customer.use-case';
import { UpdateCustomerUseCase } from '../../src/modules/customers/application/use-cases/update-customer.use-case';
import { DeactivateCustomerUseCase } from '../../src/modules/customers/application/use-cases/deactivate-customer.use-case';
import { ActivateCustomerUseCase } from '../../src/modules/customers/application/use-cases/activate-customer.use-case';
import { CustomerEntity } from '../../src/modules/customers/domain/entities/customer.entity';
import { CustomerRepository } from '../../src/modules/customers/domain/repositories/customer.repository';
import { PartyRepository } from '../../src/modules/parties/domain/repositories/party.repository';
import { PartyEntity } from '../../src/modules/parties/domain/entities/party.entity';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import {
  DuplicateCustomerError,
  InvalidCreditLimitError,
  InvalidTaxIdError,
  CustomerNotFoundError,
  CustomerAlreadyInTargetStateError,
} from '../../src/modules/customers/domain/errors/customer.errors';
import {
  createFakeUnitOfWork,
  FAKE_TRANSACTION_CONTEXT,
} from '../support/fake-unit-of-work';

function makeParty(overrides: Partial<PartyEntity> = {}): PartyEntity {
  return new PartyEntity(
    overrides.id ?? 'party-1',
    overrides.companyId ?? 'company-1',
    overrides.legalName ?? 'Cliente SRL',
    overrides.taxId ?? '30-12345678-9',
    overrides.taxCondition ?? null,
    overrides.email ?? null,
    overrides.phone ?? null,
    overrides.address ?? null,
    overrides.contactName ?? null,
    overrides.notes ?? null,
  );
}

function makeCustomer(overrides: Partial<CustomerEntity> = {}): CustomerEntity {
  return new CustomerEntity(
    overrides.id ?? 'customer-1',
    overrides.partyId ?? 'party-1',
    overrides.companyId ?? 'company-1',
    overrides.legalName ?? 'Cliente SRL',
    overrides.taxId ?? '30-12345678-9',
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

function makeCustomerRepository(): jest.Mocked<CustomerRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByPartyId: jest.fn(),
    findAllByCompany: jest.fn(),
    update: jest.fn(),
    setActive: jest.fn(),
  } as jest.Mocked<CustomerRepository>;
}

function makePartyRepository(): jest.Mocked<PartyRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByTaxId: jest.fn(),
    update: jest.fn(),
  } as jest.Mocked<PartyRepository>;
}

describe('CreateCustomerUseCase', () => {
  it('crea Party y Customer cuando no existe ningún Party con ese CUIT', async () => {
    const customerRepository = makeCustomerRepository();
    const partyRepository = makePartyRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    partyRepository.findByTaxId.mockResolvedValue(null);
    partyRepository.create.mockResolvedValue(makeParty());
    customerRepository.create.mockResolvedValue(makeCustomer());
    const useCase = new CreateCustomerUseCase(
      customerRepository,
      partyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Administrador de empresa',
      companyId: 'company-1',
      legalName: 'Cliente SRL',
      taxId: '30-12345678-9',
    });

    expect(partyRepository.create).toHaveBeenCalled();
    expect(customerRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ partyId: 'party-1' }),
      FAKE_TRANSACTION_CONTEXT,
    );
    expect(result.id).toBe('customer-1');
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'customer.create' }),
      FAKE_TRANSACTION_CONTEXT,
    );
  });

  it('RN-TER-13: agrega el rol Cliente a un Party existente (ej. ya Proveedor) sin pisar sus datos', async () => {
    const customerRepository = makeCustomerRepository();
    const partyRepository = makePartyRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    partyRepository.findByTaxId.mockResolvedValue(makeParty({ legalName: 'Nombre Original' }));
    customerRepository.findByPartyId.mockResolvedValue(null); // no tiene rol Cliente todavía
    customerRepository.create.mockResolvedValue(makeCustomer());
    const useCase = new CreateCustomerUseCase(
      customerRepository,
      partyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      legalName: 'Nombre Distinto En El Formulario',
      taxId: '30-12345678-9',
    });

    expect(partyRepository.create).not.toHaveBeenCalled();
    expect(customerRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ partyId: 'party-1' }),
      FAKE_TRANSACTION_CONTEXT,
    );
  });

  it('RN-TER-07: rechaza si el Party ya tiene el rol Cliente', async () => {
    const customerRepository = makeCustomerRepository();
    const partyRepository = makePartyRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    partyRepository.findByTaxId.mockResolvedValue(makeParty());
    customerRepository.findByPartyId.mockResolvedValue(makeCustomer());
    const useCase = new CreateCustomerUseCase(
      customerRepository,
      partyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        legalName: 'Cliente SRL',
        taxId: '30-12345678-9',
      }),
    ).rejects.toThrow(DuplicateCustomerError);
  });

  it('rechaza CUIT con formato inválido', async () => {
    const customerRepository = makeCustomerRepository();
    const partyRepository = makePartyRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateCustomerUseCase(
      customerRepository,
      partyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        legalName: 'Cliente SRL',
        taxId: 'no-es-un-cuit',
      }),
    ).rejects.toThrow(InvalidTaxIdError);
  });

  it('rechaza creditLimit negativo', async () => {
    const customerRepository = makeCustomerRepository();
    const partyRepository = makePartyRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateCustomerUseCase(
      customerRepository,
      partyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        legalName: 'Cliente SRL',
        creditLimit: '-100',
      }),
    ).rejects.toThrow(InvalidCreditLimitError);
  });

  it('rechaza si el rol no autoriza', async () => {
    const customerRepository = makeCustomerRepository();
    const partyRepository = makePartyRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateCustomerUseCase(
      customerRepository,
      partyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Empleado',
        companyId: 'company-1',
        legalName: 'Cliente SRL',
      }),
    ).rejects.toThrow(RoleNotAuthorizedError);
  });
});

describe('UpdateCustomerUseCase', () => {
  it('actualiza datos del Party y del rol en una sola operación', async () => {
    const customerRepository = makeCustomerRepository();
    const partyRepository = makePartyRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    customerRepository.findById
      .mockResolvedValueOnce(makeCustomer())
      .mockResolvedValueOnce(makeCustomer({ legalName: 'Actualizado', creditLimit: '5000' }));
    const useCase = new UpdateCustomerUseCase(
      customerRepository,
      partyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      customerId: 'customer-1',
      legalName: 'Actualizado',
      creditLimit: '5000',
    });

    expect(partyRepository.update).toHaveBeenCalledWith(
      'party-1',
      { legalName: 'Actualizado' },
      FAKE_TRANSACTION_CONTEXT,
    );
    expect(customerRepository.update).toHaveBeenCalledWith(
      'customer-1',
      { creditLimit: '5000' },
      FAKE_TRANSACTION_CONTEXT,
    );
    expect(result.legalName).toBe('Actualizado');
  });

  it('rechaza si el cliente no existe', async () => {
    const customerRepository = makeCustomerRepository();
    const partyRepository = makePartyRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    customerRepository.findById.mockResolvedValue(null);
    const useCase = new UpdateCustomerUseCase(
      customerRepository,
      partyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        customerId: 'no-existe',
        legalName: 'X',
      }),
    ).rejects.toThrow(CustomerNotFoundError);
  });
});

describe('DeactivateCustomerUseCase / ActivateCustomerUseCase', () => {
  it('desactiva un cliente activo', async () => {
    const customerRepository = makeCustomerRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    customerRepository.findById.mockResolvedValue(makeCustomer({ isActive: true }));
    customerRepository.setActive.mockResolvedValue(makeCustomer({ isActive: false }));
    const useCase = new DeactivateCustomerUseCase(
      customerRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      customerId: 'customer-1',
    });

    expect(result.isActive).toBe(false);
  });

  it('rechaza desactivar un cliente ya inactivo', async () => {
    const customerRepository = makeCustomerRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    customerRepository.findById.mockResolvedValue(makeCustomer({ isActive: false }));
    const useCase = new DeactivateCustomerUseCase(
      customerRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        customerId: 'customer-1',
      }),
    ).rejects.toThrow(CustomerAlreadyInTargetStateError);
  });

  it('reactiva un cliente inactivo', async () => {
    const customerRepository = makeCustomerRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    customerRepository.findById.mockResolvedValue(makeCustomer({ isActive: false }));
    customerRepository.setActive.mockResolvedValue(makeCustomer({ isActive: true }));
    const useCase = new ActivateCustomerUseCase(
      customerRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      customerId: 'customer-1',
    });

    expect(result.isActive).toBe(true);
  });
});
