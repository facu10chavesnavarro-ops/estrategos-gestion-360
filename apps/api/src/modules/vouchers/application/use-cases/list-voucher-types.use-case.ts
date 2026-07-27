import { Injectable } from '@nestjs/common';
import { VoucherTypeRepository } from '../../domain/repositories/voucher-type.repository';
import { VoucherTypeEntity } from '../../domain/entities/voucher-type.entity';

/** No es [CTX]: el catálogo es global de plataforma (mismo criterio que GET /roles). */
@Injectable()
export class ListVoucherTypesUseCase {
  constructor(private readonly voucherTypeRepository: VoucherTypeRepository) {}

  async execute(): Promise<VoucherTypeEntity[]> {
    return this.voucherTypeRepository.findAllActive();
  }
}
