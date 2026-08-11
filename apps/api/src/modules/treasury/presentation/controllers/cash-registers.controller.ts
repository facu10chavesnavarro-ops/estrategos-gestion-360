import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateCashRegisterUseCase } from '../../application/use-cases/create-cash-register.use-case';
import { UpdateCashRegisterUseCase } from '../../application/use-cases/update-cash-register.use-case';
import { GetCashRegisterByIdUseCase } from '../../application/use-cases/get-cash-register-by-id.use-case';
import { ListCashRegistersUseCase } from '../../application/use-cases/list-cash-registers.use-case';
import { DeactivateCashRegisterUseCase } from '../../application/use-cases/deactivate-cash-register.use-case';
import { ActivateCashRegisterUseCase } from '../../application/use-cases/activate-cash-register.use-case';
import { OpenCashSessionUseCase } from '../../application/use-cases/open-cash-session.use-case';
import { ListCashSessionsUseCase } from '../../application/use-cases/list-cash-sessions.use-case';
import { CreateCashRegisterRequestDto } from '../dto/create-cash-register-request.dto';
import { UpdateCashRegisterRequestDto } from '../dto/update-cash-register-request.dto';
import { OpenCashSessionRequestDto } from '../dto/open-cash-session-request.dto';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CurrentRoleName } from '../../../../common/decorators/current-role-name.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { assertSameCompany } from '../../../companies/presentation/assert-same-company';
import { mapTreasuryError } from '../map-treasury-error';

@ApiTags('Tesorería')
@ApiBearerAuth()
@Controller('companies/:companyId/branches/:branchId/cash-registers')
@UseGuards(CompanyContextGuard)
export class CashRegistersController {
  constructor(
    private readonly createCashRegisterUseCase: CreateCashRegisterUseCase,
    private readonly updateCashRegisterUseCase: UpdateCashRegisterUseCase,
    private readonly getCashRegisterByIdUseCase: GetCashRegisterByIdUseCase,
    private readonly listCashRegistersUseCase: ListCashRegistersUseCase,
    private readonly deactivateCashRegisterUseCase: DeactivateCashRegisterUseCase,
    private readonly activateCashRegisterUseCase: ActivateCashRegisterUseCase,
    private readonly openCashSessionUseCase: OpenCashSessionUseCase,
    private readonly listCashSessionsUseCase: ListCashSessionsUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar las cajas de una sucursal' })
  async list(
    @Param('companyId') companyId: string,
    @Param('branchId') branchId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listCashRegistersUseCase.execute(branchId, contextCompanyId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una caja' })
  async create(
    @Param('companyId') companyId: string,
    @Param('branchId') branchId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: CreateCashRegisterRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.createCashRegisterUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        branchId,
        ...body,
      });
    } catch (error) {
      mapTreasuryError(error);
    }
  }

  @Get(':cashRegisterId')
  @ApiOperation({ summary: 'Obtener una caja por id' })
  async getById(
    @Param('companyId') companyId: string,
    @Param('cashRegisterId') cashRegisterId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.getCashRegisterByIdUseCase.execute(cashRegisterId, contextCompanyId);
    } catch (error) {
      mapTreasuryError(error);
    }
  }

  @Patch(':cashRegisterId')
  @ApiOperation({
    summary: 'Actualizar una caja',
    description:
      'Incluye el mapeo contable opcional (accountId, Sprint 4) usado por ' +
      'el motor de asientos automáticos y por los movimientos manuales.',
  })
  async update(
    @Param('companyId') companyId: string,
    @Param('cashRegisterId') cashRegisterId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: UpdateCashRegisterRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.updateCashRegisterUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        cashRegisterId,
        ...body,
      });
    } catch (error) {
      mapTreasuryError(error);
    }
  }

  @Post(':cashRegisterId/deactivate')
  @ApiOperation({ summary: 'Desactivar una caja' })
  async deactivate(
    @Param('companyId') companyId: string,
    @Param('cashRegisterId') cashRegisterId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.deactivateCashRegisterUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        cashRegisterId,
      });
    } catch (error) {
      mapTreasuryError(error);
    }
  }

  @Post(':cashRegisterId/activate')
  @ApiOperation({ summary: 'Reactivar una caja' })
  async activate(
    @Param('companyId') companyId: string,
    @Param('cashRegisterId') cashRegisterId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.activateCashRegisterUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        cashRegisterId,
      });
    } catch (error) {
      mapTreasuryError(error);
    }
  }

  @Get(':cashRegisterId/sessions')
  @ApiOperation({ summary: 'Listar las sesiones (turnos) históricas de una caja' })
  async listSessions(
    @Param('companyId') companyId: string,
    @Param('cashRegisterId') cashRegisterId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listCashSessionsUseCase.execute(cashRegisterId, contextCompanyId);
  }

  @Post(':cashRegisterId/sessions')
  @ApiOperation({ summary: 'Abrir una sesión de caja (RN-CASH-02: solo una abierta por vez)' })
  async openSession(
    @Param('companyId') companyId: string,
    @Param('cashRegisterId') cashRegisterId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: OpenCashSessionRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.openCashSessionUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        cashRegisterId,
        ...body,
      });
    } catch (error) {
      mapTreasuryError(error);
    }
  }
}
