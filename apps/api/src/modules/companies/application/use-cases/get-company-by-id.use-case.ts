import { Injectable } from '@nestjs/common';
import { CompanyRepository } from '../../domain/repositories/company.repository';
import { CompanyEntity } from '../../domain/entities/company.entity';
import { CompanyNotFoundError } from '../../domain/errors/company.errors';

@Injectable()
export class GetCompanyByIdUseCase {
  constructor(private readonly companyRepository: CompanyRepository) {}

  async execute(companyId: string): Promise<CompanyEntity> {
    const company = await this.companyRepository.findById(companyId);
    if (!company) {
      throw new CompanyNotFoundError();
    }
    return company;
  }
}
