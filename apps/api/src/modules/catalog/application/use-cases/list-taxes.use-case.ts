import { Injectable } from '@nestjs/common';
import { TaxRepository } from '../../domain/repositories/tax.repository';
import { TaxEntity } from '../../domain/entities/tax.entity';
import { ListTaxesUseCaseInput } from '../dto/tax.dto';

@Injectable()
export class ListTaxesUseCase {
  constructor(private readonly taxRepository: TaxRepository) {}

  async execute(input: ListTaxesUseCaseInput): Promise<TaxEntity[]> {
    return this.taxRepository.findAllByCompany(input.companyId, {
      onlyCurrentlyValid: input.onlyCurrentlyValid,
    });
  }
}
