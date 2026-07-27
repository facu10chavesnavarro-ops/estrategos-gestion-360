import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateChartOfAccountUseCase } from '../../application/use-cases/create-chart-of-account.use-case';
import { UpdateChartOfAccountUseCase } from '../../application/use-cases/update-chart-of-account.use-case';
import { GetChartOfAccountByIdUseCase } from '../../application/use-cases/get-chart-of-account-by-id.use-case';
import { ListChartOfAccountsUseCase } from '../../application/use-cases/list-chart-of-accounts.use-case';
import { DeactivateChartOfAccountUseCase } from '../../application/use-cases/deactivate-chart-of-account.use-case';
import { ActivateChartOfAccountUseCase } from '../../application/use-cases/activate-chart-of-account.use-case';
import { GetAccountLedgerUseCase } from '../../application/use-cases/get-account-ledger.use-case';
import { CreateChartOfAccountRequestDto } from '../dto/create-chart-of-account-request.dto';
import { UpdateChartOfAccountRequestDto } from '../dto/update-chart-of-account-request.dto';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CurrentRoleName } from '../../../../common/decorators/current-role-name.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { assertSameCompany } from '../../../companies/presentation/assert-same-company';
import { mapAccountingError } from '../map-accounting-error';

@ApiTags('Contabilidad')
@Controller('companies/:companyId/chart-of-accounts')
@UseGuards(CompanyContextGuard)
export class ChartOfAccountsController {
  constructor(
    private readonly createChartOfAccountUseCase: CreateChartOfAccountUseCase,
    private readonly updateChartOfAccountUseCase: UpdateChartOfAccountUseCase,
    private readonly getChartOfAccountByIdUseCase: GetChartOfAccountByIdUseCase,
    private readonly listChartOfAccountsUseCase: ListChartOfAccountsUseCase,
    private readonly deactivateChartOfAccountUseCase: DeactivateChartOfAccountUseCase,
    private readonly activateChartOfAccountUseCase: ActivateChartOfAccountUseCase,
    private readonly getAccountLedgerUseCase: GetAccountLedgerUseCase,
  ) {}

  @Get()
  async list(
    @Param('companyId') companyId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @Query('isActive') isActive?: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listChartOfAccountsUseCase.execute({
      companyId: contextCompanyId,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Post()
  async create(
    @Param('companyId') companyId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: CreateChartOfAccountRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.createChartOfAccountUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        ...body,
      });
    } catch (error) {
      mapAccountingError(error);
    }
  }

  @Get(':accountId')
  async getById(
    @Param('companyId') companyId: string,
    @Param('accountId') accountId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.getChartOfAccountByIdUseCase.execute(accountId, contextCompanyId);
    } catch (error) {
      mapAccountingError(error);
    }
  }

  @Get(':accountId/ledger')
  async ledger(
    @Param('companyId') companyId: string,
    @Param('accountId') accountId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.getAccountLedgerUseCase.execute({ companyId: contextCompanyId, accountId });
    } catch (error) {
      mapAccountingError(error);
    }
  }

  @Patch(':accountId')
  async update(
    @Param('companyId') companyId: string,
    @Param('accountId') accountId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: UpdateChartOfAccountRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.updateChartOfAccountUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        accountId,
        ...body,
      });
    } catch (error) {
      mapAccountingError(error);
    }
  }

  @Post(':accountId/deactivate')
  async deactivate(
    @Param('companyId') companyId: string,
    @Param('accountId') accountId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.deactivateChartOfAccountUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        accountId,
      });
    } catch (error) {
      mapAccountingError(error);
    }
  }

  @Post(':accountId/activate')
  async activate(
    @Param('companyId') companyId: string,
    @Param('accountId') accountId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.activateChartOfAccountUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        accountId,
      });
    } catch (error) {
      mapAccountingError(error);
    }
  }
}
