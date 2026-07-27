import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ListVoucherTypesUseCase } from '../../application/use-cases/list-voucher-types.use-case';

/** Catálogo global de plataforma — no requiere [CTX] (mismo criterio que GET /roles). */
@ApiTags('Comprobantes')
@Controller('voucher-types')
export class VoucherTypesController {
  constructor(private readonly listVoucherTypesUseCase: ListVoucherTypesUseCase) {}

  @Get()
  async list() {
    return this.listVoucherTypesUseCase.execute();
  }
}
