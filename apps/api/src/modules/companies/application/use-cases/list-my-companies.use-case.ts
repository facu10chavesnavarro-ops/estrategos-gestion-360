import { Injectable } from '@nestjs/common';
import { CompanyRepository } from '../../domain/repositories/company.repository';
import { CompanyEntity } from '../../domain/entities/company.entity';

@Injectable()
export class ListMyCompaniesUseCase {
  constructor(private readonly companyRepository: CompanyRepository) {}

  async execute(userId: string): Promise<CompanyEntity[]> {
    return this.companyRepository.findAllForUser(userId);
  }
}
