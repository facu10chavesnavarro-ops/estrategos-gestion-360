import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CloseCashSessionUseCase } from '../../application/use-cases/close-cash-session.use-case';
import { CreateCashMovementUseCase } from '../../application/use-cases/create-cash-movement.use-case';
import { ListCashMovementsUseCase } from '../../application/use-cases/list-cash-movements.use-case';
import { CloseCashSessionRequestDto } from '../dto/close-cash-session-request.dto';
import { CreateCashMovementRequestDto } from '../dto/create-cash-movement-request.dto';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CurrentRoleName } from '../../../../common/decorators/current-role-name.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { assertSameCompany } from '../../../companies/presentation/assert-same-company';
import { mapTreasuryError } from '../map-treasury-error';

@ApiTags('Tesorería')
@ApiBearerAuth()
@Controller('companies/:companyId/cash-sessions')
@UseGuards(CompanyContextGuard)
export class CashSessionsController {
  constructor(
    private readonly closeCashSessionUseCase: CloseCashSessionUseCase,
    private readonly createCashMovementUseCase: CreateCashMovementUseCase,
    private readonly listCashMovementsUseCase: ListCashMovementsUseCase,
  ) {}

  @Post(':cashSessionId/close')
  @ApiOperation({
    summary: 'Cerrar una sesión de caja',
    description:
      'Calcula y persiste expectedBalance (según los movimientos) y ' +
      'difference (contra el closingBalance informado).',
  })
  async close(
    @Param('companyId') companyId: string,
    @Param('cashSessionId') cashSessionId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: CloseCashSessionRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.closeCashSessionUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        cashSessionId,
        ...body,
      });
    } catch (error) {
      mapTreasuryError(error);
    }
  }

  @Get(':cashSessionId/movements')
  @ApiOperation({ summary: 'Listar los movimientos de una sesión de caja' })
  async listMovements(
    @Param('companyId') companyId: string,
    @Param('cashSessionId') cashSessionId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listCashMovementsUseCase.execute(cashSessionId, contextCompanyId);
  }

  @Post(':cashSessionId/movements')
  @ApiOperation({
    summary: 'Registrar un movimiento manual de caja (ingreso o egreso)',
    description:
      'Exige `reason`. Con Contabilidad activa exige además ' +
      'counterpartAccountId (RN-ACC-06) y genera su propio asiento.',
  })
  async createMovement(
    @Param('companyId') companyId: string,
    @Param('cashSessionId') cashSessionId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: CreateCashMovementRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.createCashMovementUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        cashSessionId,
        ...body,
      });
    } catch (error) {
      mapTreasuryError(error);
    }
  }
}
