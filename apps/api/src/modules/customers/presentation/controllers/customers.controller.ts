import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CreateCustomerUseCase } from '../../application/use-cases/create-customer.use-case';
import { UpdateCustomerUseCase } from '../../application/use-cases/update-customer.use-case';
import { GetCustomerByIdUseCase } from '../../application/use-cases/get-customer-by-id.use-case';
import { ListCustomersUseCase } from '../../application/use-cases/list-customers.use-case';
import { DeactivateCustomerUseCase } from '../../application/use-cases/deactivate-customer.use-case';
import { ActivateCustomerUseCase } from '../../application/use-cases/activate-customer.use-case';
import { ImportCustomersUseCase } from '../../application/use-cases/import-customers.use-case';
import { CreateCustomerRequestDto } from '../dto/create-customer-request.dto';
import { UpdateCustomerRequestDto } from '../dto/update-customer-request.dto';
import { ImportRequestDto } from '../../../../common/presentation/dto/import-request.dto';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CurrentRoleName } from '../../../../common/decorators/current-role-name.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { assertSameCompany } from '../../../companies/presentation/assert-same-company';
import { mapCustomerError } from '../map-customer-error';

@Controller('companies/:companyId/customers')
@UseGuards(CompanyContextGuard)
export class CustomersController {
  constructor(
    private readonly createCustomerUseCase: CreateCustomerUseCase,
    private readonly updateCustomerUseCase: UpdateCustomerUseCase,
    private readonly getCustomerByIdUseCase: GetCustomerByIdUseCase,
    private readonly listCustomersUseCase: ListCustomersUseCase,
    private readonly deactivateCustomerUseCase: DeactivateCustomerUseCase,
    private readonly activateCustomerUseCase: ActivateCustomerUseCase,
    private readonly importCustomersUseCase: ImportCustomersUseCase,
  ) {}

  @Get()
  async list(
    @Param('companyId') companyId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listCustomersUseCase.execute({
      companyId: contextCompanyId,
      search,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Post()
  async create(
    @Param('companyId') companyId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: CreateCustomerRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.createCustomerUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        ...body,
      });
    } catch (error) {
      mapCustomerError(error);
    }
  }

  @Get(':customerId')
  async getById(
    @Param('companyId') companyId: string,
    @Param('customerId') customerId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.getCustomerByIdUseCase.execute(customerId, contextCompanyId);
    } catch (error) {
      mapCustomerError(error);
    }
  }

  @Patch(':customerId')
  async update(
    @Param('companyId') companyId: string,
    @Param('customerId') customerId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: UpdateCustomerRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.updateCustomerUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        customerId,
        ...body,
      });
    } catch (error) {
      mapCustomerError(error);
    }
  }

  @Post(':customerId/deactivate')
  async deactivate(
    @Param('companyId') companyId: string,
    @Param('customerId') customerId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.deactivateCustomerUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        customerId,
      });
    } catch (error) {
      mapCustomerError(error);
    }
  }

  @Post(':customerId/activate')
  async activate(
    @Param('companyId') companyId: string,
    @Param('customerId') customerId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.activateCustomerUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        customerId,
      });
    } catch (error) {
      mapCustomerError(error);
    }
  }

  @Post('import')
  async import(
    @Param('companyId') companyId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: ImportRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.importCustomersUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        csvContent: body.csvContent,
        mode: body.mode ?? 'skip-new-only',
      });
    } catch (error) {
      mapCustomerError(error);
    }
  }
}
