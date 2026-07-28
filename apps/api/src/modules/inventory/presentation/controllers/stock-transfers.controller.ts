import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateStockTransferUseCase } from '../../application/use-cases/create-stock-transfer.use-case';
import { CreateStockTransferRequestDto } from '../dto/create-stock-transfer-request.dto';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CurrentRoleName } from '../../../../common/decorators/current-role-name.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { assertSameCompany } from '../../../companies/presentation/assert-same-company';
import { mapInventoryError } from '../map-inventory-error';

@ApiTags('Stock')
@ApiBearerAuth()
@Controller('companies/:companyId/stock-transfers')
@UseGuards(CompanyContextGuard)
export class StockTransfersController {
  constructor(private readonly createStockTransferUseCase: CreateStockTransferUseCase) {}

  @Post()
  @ApiOperation({ summary: 'Transferir stock de un ítem entre dos depósitos' })
  async create(
    @Param('companyId') companyId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: CreateStockTransferRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.createStockTransferUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        ...body,
      });
    } catch (error) {
      mapInventoryError(error);
    }
  }
}
