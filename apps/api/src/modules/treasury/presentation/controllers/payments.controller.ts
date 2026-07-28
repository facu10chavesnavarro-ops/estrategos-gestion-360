import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreatePaymentUseCase } from '../../application/use-cases/create-payment.use-case';
import { ListPaymentsUseCase } from '../../application/use-cases/list-payments.use-case';
import { GetPaymentByIdUseCase } from '../../application/use-cases/get-payment-by-id.use-case';
import { CreatePaymentRequestDto } from '../dto/create-payment-request.dto';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CurrentRoleName } from '../../../../common/decorators/current-role-name.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { assertSameCompany } from '../../../companies/presentation/assert-same-company';
import { mapTreasuryError } from '../map-treasury-error';
import { PaymentDirection } from '../../domain/entities/payment.entity';

@ApiTags('Tesorería')
@ApiBearerAuth()
@Controller('companies/:companyId/payments')
@UseGuards(CompanyContextGuard)
export class PaymentsController {
  constructor(
    private readonly createPaymentUseCase: CreatePaymentUseCase,
    private readonly listPaymentsUseCase: ListPaymentsUseCase,
    private readonly getPaymentByIdUseCase: GetPaymentByIdUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar cobros/pagos, con filtros por contraparte, sentido y fecha' })
  async list(
    @Param('companyId') companyId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @Query('partyId') partyId?: string,
    @Query('direction') direction?: PaymentDirection,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listPaymentsUseCase.execute({
      companyId: contextCompanyId,
      partyId,
      direction,
      from,
      to,
    });
  }

  @Post()
  @ApiOperation({
    summary: 'Registrar un cobro (COLLECTION) o un pago (PAYMENT)',
    description:
      'El monto total se calcula sumando los medios de pago informados. ' +
      'Genera el movimiento de cuenta corriente y, si algún medio lo ' +
      'requiere, el CashMovement/BankMovement correspondiente — y, con ' +
      'Contabilidad activa, su asiento. Todo en la misma transacción.',
  })
  async create(
    @Param('companyId') companyId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: CreatePaymentRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.createPaymentUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        ...body,
      });
    } catch (error) {
      mapTreasuryError(error);
    }
  }

  @Get(':paymentId')
  @ApiOperation({ summary: 'Obtener un cobro/pago por id' })
  async getById(
    @Param('companyId') companyId: string,
    @Param('paymentId') paymentId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.getPaymentByIdUseCase.execute(paymentId, contextCompanyId);
    } catch (error) {
      mapTreasuryError(error);
    }
  }
}
