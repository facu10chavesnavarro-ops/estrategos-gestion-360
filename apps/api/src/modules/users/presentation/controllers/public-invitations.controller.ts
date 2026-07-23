import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { GetInvitationByTokenUseCase } from '../../application/use-cases/get-invitation-by-token.use-case';
import { AcceptInvitationUseCase } from '../../application/use-cases/accept-invitation.use-case';
import { AcceptInvitationRequestDto } from '../dto/accept-invitation-request.dto';
import { Public } from '../../../../common/decorators/public.decorator';
import { mapUserError } from '../map-user-error';

/**
 * Sin sesión todavía: el usuario invitado no tiene token de acceso hasta
 * aceptar. Mismo patrón que /auth/login y /auth/refresh (@Public()).
 */
@Controller('invitations')
export class PublicInvitationsController {
  constructor(
    private readonly getInvitationByTokenUseCase: GetInvitationByTokenUseCase,
    private readonly acceptInvitationUseCase: AcceptInvitationUseCase,
  ) {}

  @Public()
  @Get(':token')
  async preview(@Param('token') token: string) {
    try {
      return await this.getInvitationByTokenUseCase.execute(token);
    } catch (error) {
      mapUserError(error);
    }
  }

  @Public()
  @Post(':token/accept')
  @HttpCode(HttpStatus.OK)
  async accept(
    @Param('token') token: string,
    @Body() body: AcceptInvitationRequestDto,
  ) {
    try {
      return await this.acceptInvitationUseCase.execute({
        token,
        password: body.password,
        fullName: body.fullName,
      });
    } catch (error) {
      mapUserError(error);
    }
  }
}
