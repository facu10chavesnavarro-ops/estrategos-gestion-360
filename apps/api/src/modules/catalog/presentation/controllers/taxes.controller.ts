import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateTaxUseCase } from '../../application/use-cases/create-tax.use-case';
import { UpdateTaxUseCase } from '../../application/use-cases/update-tax.use-case';
import { CloseTaxUseCase } from '../../application/use-cases/close-tax.use-case';
import { ListTaxesUseCase } from '../../application/use-cases/list-taxes.use-case';
import { CreateTaxRequestDto } from '../dto/create-tax-request.dto';
import { UpdateTaxRequestDto } from '../dto/update-tax-request.dto';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CurrentRoleName } from '../../../../common/decorators/current-role-name.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { assertSameCompany } from '../../../companies/presentation/assert-same-company';
import { mapCatalogError } from '../map-catalog-error';

@ApiTags('Impuestos')
@Controller('companies/:companyId/taxes')
@UseGuards(CompanyContextGuard)
export class TaxesController {
  constructor(
    private readonly createTaxUseCase: CreateTaxUseCase,
    private readonly updateTaxUseCase: UpdateTaxUseCase,
    private readonly closeTaxUseCase: CloseTaxUseCase,
    private readonly listTaxesUseCase: ListTaxesUseCase,
  ) {}

  @Get()
  async list(
    @Param('companyId') companyId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @Query('onlyCurrentlyValid') onlyCurrentlyValid?: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listTaxesUseCase.execute({
      companyId: contextCompanyId,
      onlyCurrentlyValid: onlyCurrentlyValid === 'true',
    });
  }

  @Post()
  async create(
    @Param('companyId') companyId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: CreateTaxRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.createTaxUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        ...body,
      });
    } catch (error) {
      mapCatalogError(error);
    }
  }

  @Patch(':taxId')
  async update(
    @Param('companyId') companyId: string,
    @Param('taxId') taxId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: UpdateTaxRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.updateTaxUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        taxId,
        ...body,
      });
    } catch (error) {
      mapCatalogError(error);
    }
  }

  @Post(':taxId/close')
  async close(
    @Param('companyId') companyId: string,
    @Param('taxId') taxId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.closeTaxUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        taxId,
      });
    } catch (error) {
      mapCatalogError(error);
    }
  }
}
