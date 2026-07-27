import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreatePointOfSaleUseCase } from '../../application/use-cases/create-point-of-sale.use-case';
import { UpdatePointOfSaleUseCase } from '../../application/use-cases/update-point-of-sale.use-case';
import { GetPointOfSaleByIdUseCase } from '../../application/use-cases/get-point-of-sale-by-id.use-case';
import { ListPointsOfSaleUseCase } from '../../application/use-cases/list-points-of-sale.use-case';
import { DeactivatePointOfSaleUseCase } from '../../application/use-cases/deactivate-point-of-sale.use-case';
import { ActivatePointOfSaleUseCase } from '../../application/use-cases/activate-point-of-sale.use-case';
import { CreatePointOfSaleRequestDto } from '../dto/create-point-of-sale-request.dto';
import { UpdatePointOfSaleRequestDto } from '../dto/update-point-of-sale-request.dto';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CurrentRoleName } from '../../../../common/decorators/current-role-name.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { assertSameCompany } from '../../../companies/presentation/assert-same-company';
import { mapVoucherError } from '../map-voucher-error';

@ApiTags('Puntos de venta')
@Controller('companies/:companyId/branches/:branchId/points-of-sale')
@UseGuards(CompanyContextGuard)
export class PointsOfSaleController {
  constructor(
    private readonly createPointOfSaleUseCase: CreatePointOfSaleUseCase,
    private readonly updatePointOfSaleUseCase: UpdatePointOfSaleUseCase,
    private readonly getPointOfSaleByIdUseCase: GetPointOfSaleByIdUseCase,
    private readonly listPointsOfSaleUseCase: ListPointsOfSaleUseCase,
    private readonly deactivatePointOfSaleUseCase: DeactivatePointOfSaleUseCase,
    private readonly activatePointOfSaleUseCase: ActivatePointOfSaleUseCase,
  ) {}

  @Get()
  async list(
    @Param('companyId') companyId: string,
    @Param('branchId') branchId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listPointsOfSaleUseCase.execute(branchId);
  }

  @Post()
  async create(
    @Param('companyId') companyId: string,
    @Param('branchId') branchId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: CreatePointOfSaleRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.createPointOfSaleUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        branchId,
        ...body,
      });
    } catch (error) {
      mapVoucherError(error);
    }
  }

  @Get(':pointOfSaleId')
  async getById(
    @Param('companyId') companyId: string,
    @Param('pointOfSaleId') pointOfSaleId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.getPointOfSaleByIdUseCase.execute(pointOfSaleId, contextCompanyId);
    } catch (error) {
      mapVoucherError(error);
    }
  }

  @Patch(':pointOfSaleId')
  async update(
    @Param('companyId') companyId: string,
    @Param('pointOfSaleId') pointOfSaleId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: UpdatePointOfSaleRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.updatePointOfSaleUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        pointOfSaleId,
        ...body,
      });
    } catch (error) {
      mapVoucherError(error);
    }
  }

  @Post(':pointOfSaleId/deactivate')
  async deactivate(
    @Param('companyId') companyId: string,
    @Param('pointOfSaleId') pointOfSaleId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.deactivatePointOfSaleUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        pointOfSaleId,
      });
    } catch (error) {
      mapVoucherError(error);
    }
  }

  @Post(':pointOfSaleId/activate')
  async activate(
    @Param('companyId') companyId: string,
    @Param('pointOfSaleId') pointOfSaleId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.activatePointOfSaleUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        pointOfSaleId,
      });
    } catch (error) {
      mapVoucherError(error);
    }
  }
}
