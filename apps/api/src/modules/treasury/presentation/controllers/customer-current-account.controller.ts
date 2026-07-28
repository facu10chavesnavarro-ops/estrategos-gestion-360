import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetCustomerCurrentAccountUseCase } from '../../application/use-cases/get-customer-current-account.use-case';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { assertSameCompany } from '../../../companies/presentation/assert-same-company';
import { mapTreasuryError } from '../map-treasury-error';

@ApiTags('Tesorería')
@ApiBearerAuth()
@Controller('companies/:companyId/customers/:customerId/current-account')
@UseGuards(CompanyContextGuard)
export class CustomerCurrentAccountController {
  constructor(
    private readonly getCustomerCurrentAccountUseCase: GetCustomerCurrentAccountUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Consultar el saldo y los movimientos de la cuenta corriente de un cliente' })
  async get(
    @Param('companyId') companyId: string,
    @Param('customerId') customerId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.getCustomerCurrentAccountUseCase.execute(customerId, contextCompanyId);
    } catch (error) {
      mapTreasuryError(error);
    }
  }
}
