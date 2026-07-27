import { Injectable } from '@nestjs/common';
import { SupplierRepository } from '../../../suppliers/domain/repositories/supplier.repository';
import { SupplierNotFoundError } from '../../../suppliers/domain/errors/supplier.errors';
import {
  SupplierAccountRepository,
  SupplierAccountMovementRepository,
} from '../../domain/repositories/supplier-account.repository';
import { SupplierCurrentAccountView } from '../dto/current-account.dto';

/** RN-CTA-01: si el proveedor nunca tuvo un movimiento, no existe fila de cuenta — saldo 0. */
@Injectable()
export class GetSupplierCurrentAccountUseCase {
  constructor(
    private readonly supplierRepository: SupplierRepository,
    private readonly supplierAccountRepository: SupplierAccountRepository,
    private readonly supplierAccountMovementRepository: SupplierAccountMovementRepository,
  ) {}

  async execute(supplierId: string, companyId: string): Promise<SupplierCurrentAccountView> {
    const supplier = await this.supplierRepository.findById(supplierId, companyId);
    if (!supplier) {
      throw new SupplierNotFoundError();
    }

    const account = await this.supplierAccountRepository.findBySupplierId(supplierId);
    const movements = account
      ? await this.supplierAccountMovementRepository.findAllByAccount(account.id)
      : [];

    return {
      supplierId,
      currentBalance: account?.currentBalance ?? '0.00',
      movements,
    };
  }
}
