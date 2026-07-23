import { GetSupplierByIdUseCase } from '../../src/modules/suppliers/application/use-cases/get-supplier-by-id.use-case';
import { ListSuppliersUseCase } from '../../src/modules/suppliers/application/use-cases/list-suppliers.use-case';
import { SupplierEntity } from '../../src/modules/suppliers/domain/entities/supplier.entity';
import { SupplierRepository } from '../../src/modules/suppliers/domain/repositories/supplier.repository';
import { SupplierNotFoundError } from '../../src/modules/suppliers/domain/errors/supplier.errors';

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

describe('GetSupplierByIdUseCase', () => {
  it('devuelve el proveedor cuando existe en la empresa', async () => {
    const supplierRepository = makeSupplierRepository();
    supplierRepository.findById.mockResolvedValue(makeSupplier());
    const useCase = new GetSupplierByIdUseCase(supplierRepository);

    const result = await useCase.execute('supplier-1', 'company-1');

    expect(result.id).toBe('supplier-1');
  });

  it('lanza SupplierNotFoundError si no existe (o pertenece a otra empresa)', async () => {
    const supplierRepository = makeSupplierRepository();
    supplierRepository.findById.mockResolvedValue(null);
    const useCase = new GetSupplierByIdUseCase(supplierRepository);

    await expect(useCase.execute('no-existe', 'company-1')).rejects.toThrow(
      SupplierNotFoundError,
    );
  });
});

describe('ListSuppliersUseCase', () => {
  it('pasa los filtros search/isActive al repositorio', async () => {
    const supplierRepository = makeSupplierRepository();
    supplierRepository.findAllByCompany.mockResolvedValue([makeSupplier()]);
    const useCase = new ListSuppliersUseCase(supplierRepository);

    const result = await useCase.execute({
      companyId: 'company-1',
      search: 'SRL',
      isActive: false,
    });

    expect(result).toHaveLength(1);
    expect(supplierRepository.findAllByCompany).toHaveBeenCalledWith('company-1', {
      search: 'SRL',
      isActive: false,
    });
  });
});
