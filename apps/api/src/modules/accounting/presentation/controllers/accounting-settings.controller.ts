import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
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
  async listPaymentMethodMappings(
    @Param('companyId') companyId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listPaymentMethodAccountMappingsUseCase.execute(contextCompanyId);
  }

  @Post('payment-method-account-mappings')
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
