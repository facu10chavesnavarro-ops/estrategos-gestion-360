import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CreateInvitationUseCase } from '../../application/use-cases/create-invitation.use-case';
import { ListInvitationsUseCase } from '../../application/use-cases/list-invitations.use-case';
import { RevokeInvitationUseCase } from '../../application/use-cases/revoke-invitation.use-case';
import { CreateInvitationRequestDto } from '../dto/create-invitation-request.dto';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../../../common/decorators/current-company.decorator';
import { CurrentRoleName } from '../../../../common/decorators/current-role-name.decorator';
import { CompanyContextGuard } from '../../../../common/guards/company-context.guard';
import { assertSameCompany } from '../../../companies/presentation/assert-same-company';
import { mapUserError } from '../map-user-error';

@Controller('companies/:companyId/invitations')
@UseGuards(CompanyContextGuard)
export class CompanyInvitationsController {
  constructor(
    private readonly createInvitationUseCase: CreateInvitationUseCase,
    private readonly listInvitationsUseCase: ListInvitationsUseCase,
    private readonly revokeInvitationUseCase: RevokeInvitationUseCase,
  ) {}

  @Get()
  async list(
    @Param('companyId') companyId: string,
    @CurrentCompanyId() contextCompanyId: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    return this.listInvitationsUseCase.execute(contextCompanyId);
  }

  @Post()
  async create(
    @Param('companyId') companyId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
    @Body() body: CreateInvitationRequestDto,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      return await this.createInvitationUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        email: body.email,
        roleId: body.roleId,
      });
    } catch (error) {
      mapUserError(error);
    }
  }

  @Post(':invitationId/revoke')
  async revoke(
    @Param('companyId') companyId: string,
    @Param('invitationId') invitationId: string,
    @CurrentUserId() userId: string,
    @CurrentCompanyId() contextCompanyId: string,
    @CurrentRoleName() roleName: string,
  ) {
    assertSameCompany(companyId, contextCompanyId);
    try {
      await this.revokeInvitationUseCase.execute({
        requestingUserId: userId,
        requestingRoleName: roleName,
        companyId: contextCompanyId,
        invitationId,
      });
      return { success: true };
    } catch (error) {
      mapUserError(error);
    }
  }
}
