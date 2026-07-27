import { Injectable } from '@nestjs/common';
import { PaymentMethodRepository } from '../../domain/repositories/payment-method.repository';
import { PaymentMethodEntity } from '../../domain/entities/payment-method.entity';

/** No es [CTX]: el catálogo es global de plataforma (mismo criterio que GET /voucher-types). */
@Injectable()
export class ListPaymentMethodsUseCase {
  constructor(private readonly paymentMethodRepository: PaymentMethodRepository) {}

  async execute(): Promise<PaymentMethodEntity[]> {
    return this.paymentMethodRepository.findAllActive();
  }
}
