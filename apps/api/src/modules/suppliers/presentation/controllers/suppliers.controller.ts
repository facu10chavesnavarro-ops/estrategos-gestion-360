import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CreateSupplierUseCase } from '../../application/use-cases/create-supplier.use-case';
import { UpdateSupplierUseCase } from '../../application/use-cases/update-supplier.use-case';
import { GetSupplierByIdUseCase } from '../../application/use-cases/get-supplier-by-id.use-case';
import { ListSuppliersUseCase } from '../../application/use-cases/list-suppliers.use-case';
import { DeactivateSupplierUseCase } from '../../application/use-cases/deactivate-supplier.use-case';
import { ActivateSupplierUseCase } from '../../application/use-cases/activate-supplier.use-case';
import { ImportSuppliersUseCase } from '../../application/use-cases/import-suppliers.use-case';
import { CreateSupplierRequestDto } from '../dto/create-supplier-request.dto';
import { UpdateSupplierRequestDto } from '../dto/update-supplier-request.dto';
import { ImportRequestDto } from '../../../../common/presentation/dto/import-request.dto';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CurrentRoleName } from '../../../../common/decorators/current-role-name.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { assertSameCompany } from '../../../companies/presentation/assert-same-company';
import { mapSupplierError } from '../map-supplier-error';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Proveedores')
@Controller('companies/:companyId/suppliers')
@UseGuards(CompanyContextGuard)
export class SuppliersController {
  constructor(
    private readonly createSupplierUseCase: CreateSupplierUseCase,
    private readonly updateSupplierUseCase: UpdateSupplierUseCase,
    private readonly getSupplierByIdUseCase: GetSupplierByIdUseCase,
    private readonly listSuppliersUseCase: ListSuppliersUseCase,
    private readonly deactivateSupplierUseCase: DeactivateSupplierUseCase,
    private readonly activateSupplierUseCase: ActivateSupplierUseCase,
    private readonly importSuppliersUseCase: ImportSuppliersUseCase,
  ) {}

  @Get()
  async list(
    @Param('companyId') companyId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listSuppliersUseCase.execute({
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
    @Body() body: CreateSupplierRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.createSupplierUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        ...body,
      });
    } catch (error) {
      mapSupplierError(error);
    }
  }

  @Get(':supplierId')
  async getById(
    @Param('companyId') companyId: string,
    @Param('supplierId') supplierId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.getSupplierByIdUseCase.execute(supplierId, contextCompanyId);
    } catch (error) {
      mapSupplierError(error);
    }
  }

  @Patch(':supplierId')
  async update(
    @Param('companyId') companyId: string,
    @Param('supplierId') supplierId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: UpdateSupplierRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.updateSupplierUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        supplierId,
        ...body,
      });
    } catch (error) {
      mapSupplierError(error);
    }
  }

  @Post(':supplierId/deactivate')
  async deactivate(
    @Param('companyId') companyId: string,
    @Param('supplierId') supplierId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.deactivateSupplierUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        supplierId,
      });
    } catch (error) {
      mapSupplierError(error);
    }
  }

  @Post(':supplierId/activate')
  async activate(
    @Param('companyId') companyId: string,
    @Param('supplierId') supplierId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.activateSupplierUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        supplierId,
      });
    } catch (error) {
      mapSupplierError(error);
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
      return await this.importSuppliersUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        csvContent: body.csvContent,
        mode: body.mode ?? 'skip-new-only',
      });
    } catch (error) {
      mapSupplierError(error);
    }
  }
}
