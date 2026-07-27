import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateBankAccountUseCase } from '../../application/use-cases/create-bank-account.use-case';
import { UpdateBankAccountUseCase } from '../../application/use-cases/update-bank-account.use-case';
import { GetBankAccountByIdUseCase } from '../../application/use-cases/get-bank-account-by-id.use-case';
import { ListBankAccountsUseCase } from '../../application/use-cases/list-bank-accounts.use-case';
import { DeactivateBankAccountUseCase } from '../../application/use-cases/deactivate-bank-account.use-case';
import { ActivateBankAccountUseCase } from '../../application/use-cases/activate-bank-account.use-case';
import { CreateBankMovementUseCase } from '../../application/use-cases/create-bank-movement.use-case';
import { ListBankMovementsUseCase } from '../../application/use-cases/list-bank-movements.use-case';
import { CreateBankAccountRequestDto } from '../dto/create-bank-account-request.dto';
import { UpdateBankAccountRequestDto } from '../dto/update-bank-account-request.dto';
import { CreateBankMovementRequestDto } from '../dto/create-bank-movement-request.dto';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CurrentRoleName } from '../../../../common/decorators/current-role-name.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { assertSameCompany } from '../../../companies/presentation/assert-same-company';
import { mapTreasuryError } from '../map-treasury-error';

@ApiTags('Tesorería')
@Controller('companies/:companyId/bank-accounts')
@UseGuards(CompanyContextGuard)
export class BankAccountsController {
  constructor(
    private readonly createBankAccountUseCase: CreateBankAccountUseCase,
    private readonly updateBankAccountUseCase: UpdateBankAccountUseCase,
    private readonly getBankAccountByIdUseCase: GetBankAccountByIdUseCase,
    private readonly listBankAccountsUseCase: ListBankAccountsUseCase,
    private readonly deactivateBankAccountUseCase: DeactivateBankAccountUseCase,
    private readonly activateBankAccountUseCase: ActivateBankAccountUseCase,
    private readonly createBankMovementUseCase: CreateBankMovementUseCase,
    private readonly listBankMovementsUseCase: ListBankMovementsUseCase,
  ) {}

  @Get()
  async list(
    @Param('companyId') companyId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listBankAccountsUseCase.execute(contextCompanyId);
  }

  @Post()
  async create(
    @Param('companyId') companyId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: CreateBankAccountRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.createBankAccountUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        ...body,
      });
    } catch (error) {
      mapTreasuryError(error);
    }
  }

  @Get(':bankAccountId')
  async getById(
    @Param('companyId') companyId: string,
    @Param('bankAccountId') bankAccountId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.getBankAccountByIdUseCase.execute(bankAccountId, contextCompanyId);
    } catch (error) {
      mapTreasuryError(error);
    }
  }

  @Patch(':bankAccountId')
  async update(
    @Param('companyId') companyId: string,
    @Param('bankAccountId') bankAccountId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: UpdateBankAccountRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.updateBankAccountUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        bankAccountId,
        ...body,
      });
    } catch (error) {
      mapTreasuryError(error);
    }
  }

  @Post(':bankAccountId/deactivate')
  async deactivate(
    @Param('companyId') companyId: string,
    @Param('bankAccountId') bankAccountId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.deactivateBankAccountUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        bankAccountId,
      });
    } catch (error) {
      mapTreasuryError(error);
    }
  }

  @Post(':bankAccountId/activate')
  async activate(
    @Param('companyId') companyId: string,
    @Param('bankAccountId') bankAccountId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.activateBankAccountUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        bankAccountId,
      });
    } catch (error) {
      mapTreasuryError(error);
    }
  }

  @Get(':bankAccountId/movements')
  async listMovements(
    @Param('companyId') companyId: string,
    @Param('bankAccountId') bankAccountId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listBankMovementsUseCase.execute(bankAccountId);
  }

  @Post(':bankAccountId/movements')
  async createMovement(
    @Param('companyId') companyId: string,
    @Param('bankAccountId') bankAccountId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: CreateBankMovementRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.createBankMovementUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        bankAccountId,
        ...body,
      });
    } catch (error) {
      mapTreasuryError(error);
    }
  }
}
