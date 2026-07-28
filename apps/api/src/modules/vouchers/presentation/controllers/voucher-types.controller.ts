import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListVoucherTypesUseCase } from '../../application/use-cases/list-voucher-types.use-case';

/** Catálogo global de plataforma — no requiere [CTX] (mismo criterio que GET /roles). */
@ApiTags('Comprobantes')
@ApiBearerAuth()
@Controller('voucher-types')
export class VoucherTypesController {
  constructor(private readonly listVoucherTypesUseCase: ListVoucherTypesUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Listar el catálogo global de tipos de comprobante (Factura A/B/C, Nota de Crédito, etc.)',
  })
  async list() {
    return this.listVoucherTypesUseCase.execute();
  }
}
