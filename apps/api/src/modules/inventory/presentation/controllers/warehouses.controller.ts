import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateWarehouseUseCase } from '../../application/use-cases/create-warehouse.use-case';
import { UpdateWarehouseUseCase } from '../../application/use-cases/update-warehouse.use-case';
import { GetWarehouseByIdUseCase } from '../../application/use-cases/get-warehouse-by-id.use-case';
import { ListWarehousesUseCase } from '../../application/use-cases/list-warehouses.use-case';
import { DeactivateWarehouseUseCase } from '../../application/use-cases/deactivate-warehouse.use-case';
import { ActivateWarehouseUseCase } from '../../application/use-cases/activate-warehouse.use-case';
import { CreateWarehouseRequestDto } from '../dto/create-warehouse-request.dto';
import { UpdateWarehouseRequestDto } from '../dto/update-warehouse-request.dto';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CurrentRoleName } from '../../../../common/decorators/current-role-name.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { assertSameCompany } from '../../../companies/presentation/assert-same-company';
import { mapInventoryError } from '../map-inventory-error';

@ApiTags('Depósitos')
@ApiBearerAuth()
@Controller('companies/:companyId/branches/:branchId/warehouses')
@UseGuards(CompanyContextGuard)
export class WarehousesController {
  constructor(
    private readonly createWarehouseUseCase: CreateWarehouseUseCase,
    private readonly updateWarehouseUseCase: UpdateWarehouseUseCase,
    private readonly getWarehouseByIdUseCase: GetWarehouseByIdUseCase,
    private readonly listWarehousesUseCase: ListWarehousesUseCase,
    private readonly deactivateWarehouseUseCase: DeactivateWarehouseUseCase,
    private readonly activateWarehouseUseCase: ActivateWarehouseUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar los depósitos de una sucursal' })
  async list(
    @Param('companyId') companyId: string,
    @Param('branchId') branchId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listWarehousesUseCase.execute(branchId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un depósito' })
  async create(
    @Param('companyId') companyId: string,
    @Param('branchId') branchId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: CreateWarehouseRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.createWarehouseUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        branchId,
        ...body,
      });
    } catch (error) {
      mapInventoryError(error);
    }
  }

  @Get(':warehouseId')
  @ApiOperation({ summary: 'Obtener un depósito por id' })
  async getById(
    @Param('companyId') companyId: string,
    @Param('warehouseId') warehouseId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.getWarehouseByIdUseCase.execute(warehouseId, contextCompanyId);
    } catch (error) {
      mapInventoryError(error);
    }
  }

  @Patch(':warehouseId')
  @ApiOperation({ summary: 'Actualizar un depósito' })
  async update(
    @Param('companyId') companyId: string,
    @Param('warehouseId') warehouseId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: UpdateWarehouseRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.updateWarehouseUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        warehouseId,
        ...body,
      });
    } catch (error) {
      mapInventoryError(error);
    }
  }

  @Post(':warehouseId/deactivate')
  @ApiOperation({ summary: 'Desactivar un depósito' })
  async deactivate(
    @Param('companyId') companyId: string,
    @Param('warehouseId') warehouseId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.deactivateWarehouseUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        warehouseId,
      });
    } catch (error) {
      mapInventoryError(error);
    }
  }

  @Post(':warehouseId/activate')
  @ApiOperation({ summary: 'Reactivar un depósito' })
  async activate(
    @Param('companyId') companyId: string,
    @Param('warehouseId') warehouseId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.activateWarehouseUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        warehouseId,
      });
    } catch (error) {
      mapInventoryError(error);
    }
  }
}
