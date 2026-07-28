import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateVoucherUseCase } from '../../application/use-cases/create-voucher.use-case';
import { ListVouchersUseCase } from '../../application/use-cases/list-vouchers.use-case';
import { GetVoucherByIdUseCase } from '../../application/use-cases/get-voucher-by-id.use-case';
import { CreateVoucherRequestDto } from '../dto/create-voucher-request.dto';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CurrentRoleName } from '../../../../common/decorators/current-role-name.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { assertSameCompany } from '../../../companies/presentation/assert-same-company';
import { mapVoucherError } from '../map-voucher-error';

@ApiTags('Comprobantes')
@ApiBearerAuth()
@Controller('companies/:companyId/vouchers')
@UseGuards(CompanyContextGuard)
export class VouchersController {
  constructor(
    private readonly createVoucherUseCase: CreateVoucherUseCase,
    private readonly listVouchersUseCase: ListVouchersUseCase,
    private readonly getVoucherByIdUseCase: GetVoucherByIdUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar comprobantes, con filtros por contraparte, tipo y fecha' })
  async list(
    @Param('companyId') companyId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @Query('partyId') partyId?: string,
    @Query('voucherTypeId') voucherTypeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listVouchersUseCase.execute({
      companyId: contextCompanyId,
      partyId,
      voucherTypeId,
      from,
      to,
    });
  }

  @Post()
  @ApiOperation({
    summary: 'Confirmar un comprobante (Factura, Nota de Crédito, etc.)',
    description:
      'Crear = confirmar en una sola operación: numera, calcula totales, ' +
      'snapshotea precios/impuestos y aplica los efectos de stock, cuenta ' +
      'corriente y — con Contabilidad activa — el asiento correspondiente, ' +
      'todo en la misma transacción. Es inmutable una vez creado.',
  })
  async create(
    @Param('companyId') companyId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: CreateVoucherRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.createVoucherUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        ...body,
      });
    } catch (error) {
      mapVoucherError(error);
    }
  }

  @Get(':voucherId')
  @ApiOperation({ summary: 'Obtener un comprobante por id, con sus líneas' })
  async getById(
    @Param('companyId') companyId: string,
    @Param('voucherId') voucherId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.getVoucherByIdUseCase.execute(voucherId, contextCompanyId);
    } catch (error) {
      mapVoucherError(error);
    }
  }
}
