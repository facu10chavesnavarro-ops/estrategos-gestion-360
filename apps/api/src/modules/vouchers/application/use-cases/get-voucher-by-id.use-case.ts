import { Injectable } from '@nestjs/common';
import { VoucherRepository } from '../../domain/repositories/voucher.repository';
import { VoucherEntity } from '../../domain/entities/voucher.entity';
import { VoucherNotFoundError } from '../../domain/errors/voucher.errors';

@Injectable()
export class GetVoucherByIdUseCase {
  constructor(private readonly voucherRepository: VoucherRepository) {}

  async execute(voucherId: string, companyId: string): Promise<VoucherEntity> {
    const voucher = await this.voucherRepository.findById(voucherId, companyId);
    if (!voucher) {
      throw new VoucherNotFoundError();
    }
    return voucher;
  }
}
