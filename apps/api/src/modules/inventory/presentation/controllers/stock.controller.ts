import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ListStockUseCase } from '../../application/use-cases/list-stock.use-case';
import { ListStockMovementsUseCase } from '../../application/use-cases/list-stock-movements.use-case';
import { CreateStockAdjustmentUseCase } from '../../application/use-cases/create-stock-adjustment.use-case';
import { CreateStockAdjustmentRequestDto } from '../dto/create-stock-adjustment-request.dto';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CurrentRoleName } from '../../../../common/decorators/current-role-name.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { assertSameCompany } from '../../../companies/presentation/assert-same-company';
import { mapInventoryError } from '../map-inventory-error';
import { StockMovementType } from '../../domain/entities/stock-movement.entity';

@ApiTags('Stock')
@Controller('companies/:companyId/warehouses/:warehouseId')
@UseGuards(CompanyContextGuard)
export class StockController {
  constructor(
    private readonly listStockUseCase: ListStockUseCase,
    private readonly listStockMovementsUseCase: ListStockMovementsUseCase,
    private readonly createStockAdjustmentUseCase: CreateStockAdjustmentUseCase,
  ) {}

  @Get('stock')
  async listStock(
    @Param('companyId') companyId: string,
    @Param('warehouseId') warehouseId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @Query('itemId') itemId?: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listStockUseCase.execute({ companyId: contextCompanyId, warehouseId, itemId });
  }

  @Get('stock-movements')
  async listStockMovements(
    @Param('companyId') companyId: string,
    @Param('warehouseId') warehouseId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @Query('itemId') itemId?: string,
    @Query('type') type?: StockMovementType,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listStockMovementsUseCase.execute({
      companyId: contextCompanyId,
      warehouseId,
      itemId,
      type,
      from,
      to,
    });
  }

  @Post('stock-movements/adjustment')
  async createAdjustment(
    @Param('companyId') companyId: string,
    @Param('warehouseId') warehouseId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: CreateStockAdjustmentRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.createStockAdjustmentUseCase.execute({
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
}
