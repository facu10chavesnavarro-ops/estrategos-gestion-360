import { GetCustomerByIdUseCase } from '../../src/modules/customers/application/use-cases/get-customer-by-id.use-case';
import { ListCustomersUseCase } from '../../src/modules/customers/application/use-cases/list-customers.use-case';
import { CustomerEntity } from '../../src/modules/customers/domain/entities/customer.entity';
import { CustomerRepository } from '../../src/modules/customers/domain/repositories/customer.repository';
import { CustomerNotFoundError } from '../../src/modules/customers/domain/errors/customer.errors';

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

describe('GetCustomerByIdUseCase', () => {
  it('devuelve el cliente cuando existe en la empresa', async () => {
    const customerRepository = makeCustomerRepository();
    customerRepository.findById.mockResolvedValue(makeCustomer());
    const useCase = new GetCustomerByIdUseCase(customerRepository);

    const result = await useCase.execute('customer-1', 'company-1');

    expect(result.id).toBe('customer-1');
    expect(customerRepository.findById).toHaveBeenCalledWith('customer-1', 'company-1');
  });

  it('lanza CustomerNotFoundError si no existe (o pertenece a otra empresa)', async () => {
    const customerRepository = makeCustomerRepository();
    customerRepository.findById.mockResolvedValue(null);
    const useCase = new GetCustomerByIdUseCase(customerRepository);

    await expect(useCase.execute('no-existe', 'company-1')).rejects.toThrow(
      CustomerNotFoundError,
    );
  });
});

describe('ListCustomersUseCase', () => {
  it('pasa los filtros search/isActive al repositorio', async () => {
    const customerRepository = makeCustomerRepository();
    customerRepository.findAllByCompany.mockResolvedValue([makeCustomer()]);
    const useCase = new ListCustomersUseCase(customerRepository);

    const result = await useCase.execute({
      companyId: 'company-1',
      search: 'SRL',
      isActive: true,
    });

    expect(result).toHaveLength(1);
    expect(customerRepository.findAllByCompany).toHaveBeenCalledWith('company-1', {
      search: 'SRL',
      isActive: true,
    });
  });

  it('funciona sin filtros (lista completa de la empresa)', async () => {
    const customerRepository = makeCustomerRepository();
    customerRepository.findAllByCompany.mockResolvedValue([]);
    const useCase = new ListCustomersUseCase(customerRepository);

    await useCase.execute({ companyId: 'company-1' });

    expect(customerRepository.findAllByCompany).toHaveBeenCalledWith('company-1', {
      search: undefined,
      isActive: undefined,
    });
  });
});
