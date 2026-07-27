import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ListPaymentMethodsUseCase } from '../../application/use-cases/list-payment-methods.use-case';

/** Catálogo global de plataforma — no requiere [CTX] (mismo criterio que GET /voucher-types). */
@ApiTags('Tesorería')
@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly listPaymentMethodsUseCase: ListPaymentMethodsUseCase) {}

  @Get()
  async list() {
    return this.listPaymentMethodsUseCase.execute();
  }
}
