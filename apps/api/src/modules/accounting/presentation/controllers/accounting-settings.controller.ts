import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActivateAccountingUseCase } from '../../application/use-cases/activate-accounting.use-case';
import { GetAccountingSettingsUseCase } from '../../application/use-cases/get-accounting-settings.use-case';
import { UpdateAccountingSettingsUseCase } from '../../application/use-cases/update-accounting-settings.use-case';
import { SetPaymentMethodAccountMappingUseCase } from '../../application/use-cases/set-payment-method-account-mapping.use-case';
import { ListPaymentMethodAccountMappingsUseCase } from '../../application/use-cases/list-payment-method-account-mappings.use-case';
import { UpdateAccountingSettingsRequestDto } from '../dto/update-accounting-settings-request.dto';
import { SetPaymentMethodAccountMappingRequestDto } from '../dto/set-payment-method-account-mapping-request.dto';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CurrentRoleName } from '../../../../common/decorators/current-role-name.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { assertSameCompany } from '../../../companies/presentation/assert-same-company';
import { mapAccountingError } from '../map-accounting-error';

@ApiTags('Contabilidad')
@ApiBearerAuth()
@Controller('companies/:companyId/accounting-settings')
@UseGuards(CompanyContextGuard)
export class AccountingSettingsController {
  constructor(
    private readonly activateAccountingUseCase: ActivateAccountingUseCase,
    private readonly getAccountingSettingsUseCase: GetAccountingSettingsUseCase,
    private readonly updateAccountingSettingsUseCase: UpdateAccountingSettingsUseCase,
    private readonly setPaymentMethodAccountMappingUseCase: SetPaymentMethodAccountMappingUseCase,
    private readonly listPaymentMethodAccountMappingsUseCase: ListPaymentMethodAccountMappingsUseCase,
  ) {}

  @Post('activate')
  @ApiOperation({
    summary: 'Activar Contabilidad para la empresa',
    description:
      'Clona el Plan de Cuentas estándar (18 cuentas) y crea AccountingSettings ' +
      'con las cuentas de control (Deudores por Ventas, Proveedores). ' +
      'Rechaza si ya estaba activada. Contabilidad es opcional: sin activar, ' +
      'Vouchers y Payments funcionan exactamente igual que antes de este módulo.',
  })
  async activate(
    @Param('companyId') companyId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.activateAccountingUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
      });
    } catch (error) {
      mapAccountingError(error);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Obtener la configuración contable de la empresa' })
  async get(
    @Param('companyId') companyId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.getAccountingSettingsUseCase.execute(contextCompanyId);
    } catch (error) {
      mapAccountingError(error);
    }
  }

  @Put()
  @ApiOperation({ summary: 'Actualizar las cuentas de control (Deudores por Ventas / Proveedores)' })
  async update(
    @Param('companyId') companyId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: UpdateAccountingSettingsRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.updateAccountingSettingsUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        ...body,
      });
    } catch (error) {
      mapAccountingError(error);
    }
  }

  @Get('payment-method-account-mappings')
  @ApiOperation({
    summary: 'Listar el mapeo de cuentas contables por medio de pago y sentido',
  })
  async listPaymentMethodMappings(
    @Param('companyId') companyId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listPaymentMethodAccountMappingsUseCase.execute(contextCompanyId);
  }

  @Post('payment-method-account-mappings')
  @ApiOperation({
    summary: 'Mapear un medio de pago + sentido a una cuenta contable',
    description:
      'Necesario para medios que no mueven caja ni banco (ej. Cheque): ' +
      'el mismo medio puede necesitar cuentas distintas según sea cobro ' +
      '(activo, ej. "Valores a Depositar") o pago (pasivo, ej. "Cheques ' +
      'Emitidos a Pagar").',
  })
  async setPaymentMethodMapping(
    @Param('companyId') companyId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: SetPaymentMethodAccountMappingRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.setPaymentMethodAccountMappingUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        ...body,
      });
    } catch (error) {
      mapAccountingError(error);
    }
  }
}
