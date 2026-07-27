import { Injectable } from '@nestjs/common';
import { VoucherRepository } from '../../domain/repositories/voucher.repository';
import { VoucherEntity } from '../../domain/entities/voucher.entity';
import { ListVouchersUseCaseInput } from '../dto/voucher.dto';

@Injectable()
export class ListVouchersUseCase {
  constructor(private readonly voucherRepository: VoucherRepository) {}

  async execute(input: ListVouchersUseCaseInput): Promise<VoucherEntity[]> {
    return this.voucherRepository.findAllByCompany(input.companyId, {
      partyId: input.partyId,
      voucherTypeId: input.voucherTypeId,
      from: input.from ? new Date(input.from) : undefined,
      to: input.to ? new Date(input.to) : undefined,
    });
  }
}
