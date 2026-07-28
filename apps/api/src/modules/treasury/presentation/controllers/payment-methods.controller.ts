import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListPaymentMethodsUseCase } from '../../application/use-cases/list-payment-methods.use-case';

/** Catálogo global de plataforma — no requiere [CTX] (mismo criterio que GET /voucher-types). */
@ApiTags('Tesorería')
@ApiBearerAuth()
@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly listPaymentMethodsUseCase: ListPaymentMethodsUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Listar el catálogo global de medios de pago' })
  async list() {
    return this.listPaymentMethodsUseCase.execute();
  }
}
