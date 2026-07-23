import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CreateBranchUseCase } from '../../application/use-cases/create-branch.use-case';
import { UpdateBranchUseCase } from '../../application/use-cases/update-branch.use-case';
import { ListBranchesUseCase } from '../../application/use-cases/list-branches.use-case';
import { DeactivateBranchUseCase } from '../../application/use-cases/deactivate-branch.use-case';
import { ActivateBranchUseCase } from '../../application/use-cases/activate-branch.use-case';
import { CreateBranchRequestDto } from '../dto/create-branch-request.dto';
import { UpdateBranchRequestDto } from '../dto/update-branch-request.dto';
import { DeactivateRequestDto } from '../dto/deactivate-request.dto';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CurrentRoleName } from '../../../../common/decorators/current-role-name.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { mapCompanyError } from '../map-company-error';
import { assertSameCompany } from '../assert-same-company';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Sucursales')
@Controller('companies/:companyId/branches')
@UseGuards(CompanyContextGuard)
export class BranchesController {
  constructor(
    private readonly createBranchUseCase: CreateBranchUseCase,
    private readonly updateBranchUseCase: UpdateBranchUseCase,
    private readonly listBranchesUseCase: ListBranchesUseCase,
    private readonly deactivateBranchUseCase: DeactivateBranchUseCase,
    private readonly activateBranchUseCase: ActivateBranchUseCase,
  ) {}

  @Get()
  async list(
    @Param('companyId') companyId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listBranchesUseCase.execute(contextCompanyId);
  }

  @Post()
  async create(
    @Param('companyId') companyId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: CreateBranchRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.createBranchUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        ...body,
      });
    } catch (error) {
      mapCompanyError(error);
    }
  }

  @Patch(':branchId')
  async update(
    @Param('companyId') companyId: string,
    @Param('branchId') branchId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: UpdateBranchRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.updateBranchUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        branchId,
        ...body,
      });
    } catch (error) {
      mapCompanyError(error);
    }
  }

  @Post(':branchId/deactivate')
  async deactivate(
    @Param('companyId') companyId: string,
    @Param('branchId') branchId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: DeactivateRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.deactivateBranchUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        branchId,
        reason: body.reason,
      });
    } catch (error) {
      mapCompanyError(error);
    }
  }

  @Post(':branchId/activate')
  async activate(
    @Param('companyId') companyId: string,
    @Param('branchId') branchId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.activateBranchUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        branchId,
      });
    } catch (error) {
      mapCompanyError(error);
    }
  }
}
