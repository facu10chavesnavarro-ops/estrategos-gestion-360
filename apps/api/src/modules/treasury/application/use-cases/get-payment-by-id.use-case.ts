import { Injectable } from '@nestjs/common';
import { PaymentRepository } from '../../domain/repositories/payment.repository';
import { PaymentEntity } from '../../domain/entities/payment.entity';
import { PaymentNotFoundError } from '../../domain/errors/payment.errors';

@Injectable()
export class GetPaymentByIdUseCase {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async execute(paymentId: string, companyId: string): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findById(paymentId, companyId);
    if (!payment) {
      throw new PaymentNotFoundError();
    }
    return payment;
  }
}
