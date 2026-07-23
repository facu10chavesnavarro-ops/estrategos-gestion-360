import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ListMyCompaniesUseCase } from '../../application/use-cases/list-my-companies.use-case';
import { CreateCompanyUseCase } from '../../application/use-cases/create-company.use-case';
import { UpdateCompanyUseCase } from '../../application/use-cases/update-company.use-case';
import { GetCompanyByIdUseCase } from '../../application/use-cases/get-company-by-id.use-case';
import { DeactivateCompanyUseCase } from '../../application/use-cases/deactivate-company.use-case';
import { ActivateCompanyUseCase } from '../../application/use-cases/activate-company.use-case';
import { CreateCompanyRequestDto } from '../dto/create-company-request.dto';
import { UpdateCompanyRequestDto } from '../dto/update-company-request.dto';
import { DeactivateRequestDto } from '../dto/deactivate-request.dto';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CurrentRoleName } from '../../../../common/decorators/current-role-name.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { mapCompanyError } from '../map-company-error';
import { assertSameCompany } from '../assert-same-company';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Empresas')
@Controller()
export class CompaniesController {
  constructor(
    private readonly listMyCompaniesUseCase: ListMyCompaniesUseCase,
    private readonly createCompanyUseCase: CreateCompanyUseCase,
    private readonly updateCompanyUseCase: UpdateCompanyUseCase,
    private readonly getCompanyByIdUseCase: GetCompanyByIdUseCase,
    private readonly deactivateCompanyUseCase: DeactivateCompanyUseCase,
    private readonly activateCompanyUseCase: ActivateCompanyUseCase,
  ) {}

  /** GET /me/companies — empresas autorizadas del usuario logueado. */
  @Get('me/companies')
  async listMyCompanies(@CurrentUserId() userId: string) {
    return this.listMyCompaniesUseCase.execute(userId);
  }

  /** POST /companies — RN-EMP-03: requiere rol de tenant, no pasa por CompanyContextGuard (la empresa aún no existe). */
  @Post('companies')
  async create(
    @CurrentUserId() userId: string,
    @Body() body: CreateCompanyRequestDto,
  ) {
    try {
      return await this.createCompanyUseCase.execute({
        requestingUserId: userId,
        ...body,
      });
    } catch (error) {
      mapCompanyError(error);
    }
  }

  @Get('companies/:id')
  @UseGuards(CompanyContextGuard)
  async getById(
    @Param('id') id: string,
    @CurrentCompanyId() companyId: string,
  ) {
    assertSameCompany(id, companyId);
    try {
      return await this.getCompanyByIdUseCase.execute(companyId);
    } catch (error) {
      mapCompanyError(error);
    }
  }

  @Patch('companies/:id')
  @UseGuards(CompanyContextGuard)
  async update(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() companyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: UpdateCompanyRequestDto,
  ) {
    assertSameCompany(id, companyId);
    try {
      return await this.updateCompanyUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId,
        ...body,
      });
    } catch (error) {
      mapCompanyError(error);
    }
  }

  @Post('companies/:id/deactivate')
  @UseGuards(CompanyContextGuard)
  async deactivate(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() companyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: DeactivateRequestDto,
  ) {
    assertSameCompany(id, companyId);
    try {
      return await this.deactivateCompanyUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId,
        reason: body.reason,
      });
    } catch (error) {
      mapCompanyError(error);
    }
  }

  @Post('companies/:id/activate')
  @UseGuards(CompanyContextGuard)
  async activate(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() companyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(id, companyId);
    try {
      return await this.activateCompanyUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId,
      });
    } catch (error) {
      mapCompanyError(error);
    }
  }
}
