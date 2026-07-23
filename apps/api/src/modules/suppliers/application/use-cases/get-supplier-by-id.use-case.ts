import { Injectable } from '@nestjs/common';
import { SupplierRepository } from '../../domain/repositories/supplier.repository';
import { SupplierEntity } from '../../domain/entities/supplier.entity';
import { SupplierNotFoundError } from '../../domain/errors/supplier.errors';

@Injectable()
export class GetSupplierByIdUseCase {
  constructor(private readonly supplierRepository: SupplierRepository) {}

  async execute(supplierId: string, companyId: string): Promise<SupplierEntity> {
    const supplier = await this.supplierRepository.findById(supplierId, companyId);
    if (!supplier) {
      throw new SupplierNotFoundError();
    }
    return supplier;
  }
}
