import { Injectable } from '@nestjs/common';
import { SupplierRepository } from '../../domain/repositories/supplier.repository';
import { SupplierEntity } from '../../domain/entities/supplier.entity';
import { ListSuppliersUseCaseInput } from '../dto/supplier.dto';

@Injectable()
export class ListSuppliersUseCase {
  constructor(private readonly supplierRepository: SupplierRepository) {}

  async execute(input: ListSuppliersUseCaseInput): Promise<SupplierEntity[]> {
    return this.supplierRepository.findAllByCompany(input.companyId, {
      search: input.search,
      isActive: input.isActive,
    });
  }
}
