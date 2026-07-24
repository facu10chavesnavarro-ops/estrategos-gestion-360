import { CreateSupplierUseCase } from '../../src/modules/suppliers/application/use-cases/create-supplier.use-case';
import { UpdateSupplierUseCase } from '../../src/modules/suppliers/application/use-cases/update-supplier.use-case';
import { DeactivateSupplierUseCase } from '../../src/modules/suppliers/application/use-cases/deactivate-supplier.use-case';
import { ActivateSupplierUseCase } from '../../src/modules/suppliers/application/use-cases/activate-supplier.use-case';
import { SupplierEntity } from '../../src/modules/suppliers/domain/entities/supplier.entity';
import { SupplierRepository } from '../../src/modules/suppliers/domain/repositories/supplier.repository';
import { PartyRepository } from '../../src/modules/parties/domain/repositories/party.repository';
import { PartyEntity } from '../../src/modules/parties/domain/entities/party.entity';
import { AuditLogRepository } from '../../src/common/domain/repositories/audit-log.repository';
import { RoleNotAuthorizedError } from '../../src/common/domain/errors/authorization.error';
import {
  DuplicateSupplierError,
  InvalidTaxIdError,
  SupplierNotFoundError,
  SupplierAlreadyInTargetStateError,
} from '../../src/modules/suppliers/domain/errors/supplier.errors';
import {
  createFakeUnitOfWork,
  FAKE_TRANSACTION_CONTEXT,
} from '../support/fake-unit-of-work';

function makeParty(overrides: Partial<PartyEntity> = {}): PartyEntity {
  return new PartyEntity(
    overrides.id ?? 'party-1',
    overrides.companyId ?? 'company-1',
    overrides.legalName ?? 'Proveedor SRL',
    overrides.taxId ?? '30-12345678-9',
    overrides.taxCondition ?? null,
    overrides.email ?? null,
    overrides.phone ?? null,
    overrides.address ?? null,
    overrides.contactName ?? null,
    overrides.notes ?? null,
  );
}

function makeSupplier(overrides: Partial<SupplierEntity> = {}): SupplierEntity {
  return new SupplierEntity(
    overrides.id ?? 'supplier-1',
    overrides.partyId ?? 'party-1',
    overrides.companyId ?? 'company-1',
    overrides.legalName ?? 'Proveedor SRL',
    overrides.taxId ?? '30-12345678-9',
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

function makeSupplierRepository(): jest.Mocked<SupplierRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByPartyId: jest.fn(),
    findAllByCompany: jest.fn(),
    update: jest.fn(),
    setActive: jest.fn(),
  } as jest.Mocked<SupplierRepository>;
}

function makePartyRepository(): jest.Mocked<PartyRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByTaxId: jest.fn(),
    update: jest.fn(),
  } as jest.Mocked<PartyRepository>;
}

describe('CreateSupplierUseCase', () => {
  it('crea Party y Supplier cuando no existe ningún Party con ese CUIT', async () => {
    const supplierRepository = makeSupplierRepository();
    const partyRepository = makePartyRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    partyRepository.findByTaxId.mockResolvedValue(null);
    partyRepository.create.mockResolvedValue(makeParty());
    supplierRepository.create.mockResolvedValue(makeSupplier());
    const useCase = new CreateSupplierUseCase(
      supplierRepository,
      partyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Administrador de empresa',
      companyId: 'company-1',
      legalName: 'Proveedor SRL',
      taxId: '30-12345678-9',
      bankCbu: '0000000000000000000000',
    });

    expect(result.id).toBe('supplier-1');
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'supplier.create' }),
      FAKE_TRANSACTION_CONTEXT,
    );
  });

  it('RN-TER-13: agrega el rol Proveedor a un Party existente (ej. ya Cliente) sin pisar sus datos', async () => {
    const supplierRepository = makeSupplierRepository();
    const partyRepository = makePartyRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    partyRepository.findByTaxId.mockResolvedValue(makeParty());
    supplierRepository.findByPartyId.mockResolvedValue(null);
    supplierRepository.create.mockResolvedValue(makeSupplier());
    const useCase = new CreateSupplierUseCase(
      supplierRepository,
      partyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      legalName: 'Nombre Distinto',
      taxId: '30-12345678-9',
    });

    expect(partyRepository.create).not.toHaveBeenCalled();
  });

  it('RN-TER-07: rechaza si el Party ya tiene el rol Proveedor', async () => {
    const supplierRepository = makeSupplierRepository();
    const partyRepository = makePartyRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    partyRepository.findByTaxId.mockResolvedValue(makeParty());
    supplierRepository.findByPartyId.mockResolvedValue(makeSupplier());
    const useCase = new CreateSupplierUseCase(
      supplierRepository,
      partyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        legalName: 'Proveedor SRL',
        taxId: '30-12345678-9',
      }),
    ).rejects.toThrow(DuplicateSupplierError);
  });

  it('rechaza CUIT con formato inválido', async () => {
    const supplierRepository = makeSupplierRepository();
    const partyRepository = makePartyRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateSupplierUseCase(
      supplierRepository,
      partyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        legalName: 'Proveedor SRL',
        taxId: 'no-es-un-cuit',
      }),
    ).rejects.toThrow(InvalidTaxIdError);
  });

  it('rechaza si el rol no autoriza', async () => {
    const supplierRepository = makeSupplierRepository();
    const partyRepository = makePartyRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    const useCase = new CreateSupplierUseCase(
      supplierRepository,
      partyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Empleado',
        companyId: 'company-1',
        legalName: 'Proveedor SRL',
      }),
    ).rejects.toThrow(RoleNotAuthorizedError);
  });
});

describe('UpdateSupplierUseCase', () => {
  it('actualiza datos del Party y del rol (datos bancarios) en una sola operación', async () => {
    const supplierRepository = makeSupplierRepository();
    const partyRepository = makePartyRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    supplierRepository.findById
      .mockResolvedValueOnce(makeSupplier())
      .mockResolvedValueOnce(makeSupplier({ bankCbu: '111', legalName: 'Actualizado' }));
    const useCase = new UpdateSupplierUseCase(
      supplierRepository,
      partyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      supplierId: 'supplier-1',
      legalName: 'Actualizado',
      bankCbu: '111',
    });

    expect(partyRepository.update).toHaveBeenCalledWith(
      'party-1',
      { legalName: 'Actualizado' },
      FAKE_TRANSACTION_CONTEXT,
    );
    expect(supplierRepository.update).toHaveBeenCalledWith(
      'supplier-1',
      { bankCbu: '111' },
      FAKE_TRANSACTION_CONTEXT,
    );
    expect(result.bankCbu).toBe('111');
  });

  it('rechaza si el proveedor no existe', async () => {
    const supplierRepository = makeSupplierRepository();
    const partyRepository = makePartyRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    supplierRepository.findById.mockResolvedValue(null);
    const useCase = new UpdateSupplierUseCase(
      supplierRepository,
      partyRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        supplierId: 'no-existe',
        legalName: 'X',
      }),
    ).rejects.toThrow(SupplierNotFoundError);
  });
});

describe('DeactivateSupplierUseCase / ActivateSupplierUseCase', () => {
  it('desactiva un proveedor activo', async () => {
    const supplierRepository = makeSupplierRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    supplierRepository.findById.mockResolvedValue(makeSupplier({ isActive: true }));
    supplierRepository.setActive.mockResolvedValue(makeSupplier({ isActive: false }));
    const useCase = new DeactivateSupplierUseCase(
      supplierRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      supplierId: 'supplier-1',
    });

    expect(result.isActive).toBe(false);
  });

  it('rechaza desactivar un proveedor ya inactivo', async () => {
    const supplierRepository = makeSupplierRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    supplierRepository.findById.mockResolvedValue(makeSupplier({ isActive: false }));
    const useCase = new DeactivateSupplierUseCase(
      supplierRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    await expect(
      useCase.execute({
        requestingUserId: 'user-1',
        requestingRoleName: 'Propietario',
        companyId: 'company-1',
        supplierId: 'supplier-1',
      }),
    ).rejects.toThrow(SupplierAlreadyInTargetStateError);
  });

  it('reactiva un proveedor inactivo', async () => {
    const supplierRepository = makeSupplierRepository();
    const auditLogRepository = { record: jest.fn() } as jest.Mocked<AuditLogRepository>;
    supplierRepository.findById.mockResolvedValue(makeSupplier({ isActive: false }));
    supplierRepository.setActive.mockResolvedValue(makeSupplier({ isActive: true }));
    const useCase = new ActivateSupplierUseCase(
      supplierRepository,
      auditLogRepository,
      createFakeUnitOfWork(),
    );

    const result = await useCase.execute({
      requestingUserId: 'user-1',
      requestingRoleName: 'Propietario',
      companyId: 'company-1',
      supplierId: 'supplier-1',
    });

    expect(result.isActive).toBe(true);
  });
});
