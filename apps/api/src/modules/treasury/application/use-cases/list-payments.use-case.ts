import { Injectable } from '@nestjs/common';
import { PaymentRepository } from '../../domain/repositories/payment.repository';
import { PaymentEntity } from '../../domain/entities/payment.entity';
import { ListPaymentsUseCaseInput } from '../dto/payment.dto';

@Injectable()
export class ListPaymentsUseCase {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async execute(input: ListPaymentsUseCaseInput): Promise<PaymentEntity[]> {
    return this.paymentRepository.findAllByCompany(input.companyId, {
      partyId: input.partyId,
      direction: input.direction,
      from: input.from ? new Date(input.from) : undefined,
      to: input.to ? new Date(input.to) : undefined,
    });
  }
}
