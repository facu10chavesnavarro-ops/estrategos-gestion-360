import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetSupplierCurrentAccountUseCase } from '../../application/use-cases/get-supplier-current-account.use-case';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { assertSameCompany } from '../../../companies/presentation/assert-same-company';
import { mapTreasuryError } from '../map-treasury-error';

@ApiTags('Tesorería')
@ApiBearerAuth()
@Controller('companies/:companyId/suppliers/:supplierId/current-account')
@UseGuards(CompanyContextGuard)
export class SupplierCurrentAccountController {
  constructor(
    private readonly getSupplierCurrentAccountUseCase: GetSupplierCurrentAccountUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Consultar el saldo y los movimientos de la cuenta corriente de un proveedor' })
  async get(
    @Param('companyId') companyId: string,
    @Param('supplierId') supplierId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.getSupplierCurrentAccountUseCase.execute(supplierId, contextCompanyId);
    } catch (error) {
      mapTreasuryError(error);
    }
  }
}
