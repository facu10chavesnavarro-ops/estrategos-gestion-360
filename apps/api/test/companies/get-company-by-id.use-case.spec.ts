import { GetCompanyByIdUseCase } from '../../src/modules/companies/application/use-cases/get-company-by-id.use-case';
import { CompanyEntity } from '../../src/modules/companies/domain/entities/company.entity';
import { CompanyRepository } from '../../src/modules/companies/domain/repositories/company.repository';
import { CompanyNotFoundError } from '../../src/modules/companies/domain/errors/company.errors';

function makeCompany(): CompanyEntity {
  return new CompanyEntity(
    'company-1',
    'tenant-1',
    'Empresa Piloto SRL',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    'ARS',
    'America/Argentina/Jujuy',
    false,
    true,
  );
}

describe('GetCompanyByIdUseCase', () => {
  it('devuelve la empresa cuando existe', async () => {
    const companyRepository = {
      create: jest.fn(),
      findAllForUser: jest.fn(),
      findById: jest.fn().mockResolvedValue(makeCompany()),
      update: jest.fn(),
      setActive: jest.fn(),
    } as unknown as jest.Mocked<CompanyRepository>;
    const useCase = new GetCompanyByIdUseCase(companyRepository);

    const result = await useCase.execute('company-1');

    expect(result.id).toBe('company-1');
  });

  it('lanza CompanyNotFoundError si no existe', async () => {
    const companyRepository = {
      create: jest.fn(),
      findAllForUser: jest.fn(),
      findById: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
      setActive: jest.fn(),
    } as unknown as jest.Mocked<CompanyRepository>;
    const useCase = new GetCompanyByIdUseCase(companyRepository);

    await expect(useCase.execute('no-existe')).rejects.toThrow(CompanyNotFoundError);
  });
});
