import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ListCompanyMembersUseCase } from '../../application/use-cases/list-company-members.use-case';
import { ChangeMemberRoleUseCase } from '../../application/use-cases/change-member-role.use-case';
import { DeactivateMemberUseCase } from '../../application/use-cases/deactivate-member.use-case';
import { ActivateMemberUseCase } from '../../application/use-cases/activate-member.use-case';
import { ChangeMemberRoleRequestDto } from '../dto/change-member-role-request.dto';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CurrentRoleName } from '../../../../common/decorators/current-role-name.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { assertSameCompany } from '../../../companies/presentation/assert-same-company';
import { mapUserError } from '../map-user-error';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Miembros de empresa')
@Controller('companies/:companyId/members')
@UseGuards(CompanyContextGuard)
export class CompanyMembersController {
  constructor(
    private readonly listCompanyMembersUseCase: ListCompanyMembersUseCase,
    private readonly changeMemberRoleUseCase: ChangeMemberRoleUseCase,
    private readonly deactivateMemberUseCase: DeactivateMemberUseCase,
    private readonly activateMemberUseCase: ActivateMemberUseCase,
  ) {}

  @Get()
  async list(
    @Param('companyId') companyId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listCompanyMembersUseCase.execute(contextCompanyId);
  }

  @Patch(':userId/role')
  async changeRole(
    @Param('companyId') companyId: string,
    @Param('userId') targetUserId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: ChangeMemberRoleRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      await this.changeMemberRoleUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        targetUserId,
        roleId: body.roleId,
      });
      return { success: true };
    } catch (error) {
      mapUserError(error);
    }
  }

  @Post(':userId/deactivate')
  async deactivate(
    @Param('companyId') companyId: string,
    @Param('userId') targetUserId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      await this.deactivateMemberUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        targetUserId,
      });
      return { success: true };
    } catch (error) {
      mapUserError(error);
    }
  }

  @Post(':userId/activate')
  async activate(
    @Param('companyId') companyId: string,
    @Param('userId') targetUserId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      await this.activateMemberUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        targetUserId,
      });
      return { success: true };
    } catch (error) {
      mapUserError(error);
    }
  }
}
