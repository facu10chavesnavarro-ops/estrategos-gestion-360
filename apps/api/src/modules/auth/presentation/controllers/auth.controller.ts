import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RefreshSessionUseCase } from '../../application/use-cases/refresh-session.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { GetCurrentUserUseCase } from '../../application/use-cases/get-current-user.use-case';
import {
  LoginRequestDto,
  RefreshRequestDto,
} from '../dto/login-request.dto';
import {
  InvalidCredentialsError,
  UserInactiveError,
  InvalidRefreshTokenError,
  InvalidAccessTokenError,
} from '../../domain/errors/auth.errors';
import { Public } from '../../../../common/decorators/public.decorator';
import { CurrentUserId } from '../../../../common/decorators/current-user.decorator';
import { OptionalCompanyId } from '../../../../common/decorators/optional-company-id.decorator';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ login: { limit: 5, ttl: 15 * 60 * 1000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Devuelve un access token (corta duración) y un refresh token ' +
      '(rotable) junto con los datos básicos del usuario. No requiere ' +
      'X-Company-Id: la selección de empresa es un paso posterior, vía ' +
      'GET /companies para listar las empresas del usuario. Limitado a 5 ' +
      'intentos cada 15 minutos por IP (auditoría de seguridad, hallazgo A2) ' +
      'para mitigar fuerza bruta / credential stuffing.',
  })
  @ApiResponse({ status: 200, description: 'Credenciales válidas.' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas o usuario inactivo.' })
  @ApiResponse({ status: 429, description: 'Demasiados intentos — reintentar más tarde.' })
  async login(@Body() body: LoginRequestDto) {
    try {
      return await this.loginUseCase.execute(body);
    } catch (error) {
      if (
        error instanceof InvalidCredentialsError ||
        error instanceof UserInactiveError
      ) {
        throw new UnauthorizedException(error.message);
      }
      throw error;
    }
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshRequestDto) {
    try {
      return await this.refreshSessionUseCase.execute({
        refreshToken: body.refreshToken,
      });
    } catch (error) {
      if (error instanceof InvalidRefreshTokenError) {
        throw new UnauthorizedException(error.message);
      }
      throw error;
    }
  }

  /**
   * M01 del documento fuente: "cierre de sesión". Público como /refresh —
   * el access token puede haber expirado ya cuando el usuario cierra sesión.
   * Siempre devuelve 200: para quien llama, "cerrar sesión" con un token
   * viejo o inválido no es un error, es el resultado que ya buscaba.
   */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() body: RefreshRequestDto) {
    await this.logoutUseCase.execute({ refreshToken: body.refreshToken });
    return { success: true };
  }

  /**
   * Fuente de verdad para reconstruir la sesión en el cliente (usuario +
   * rol en la empresa activa) sin depender de estado guardado en el
   * navegador — ver docs/frontend/04-sprint-f1-configuracion.md, addendum
   * "GET /auth/me". Requiere JWT (no es @Public()); X-Company-Id es
   * opcional — sin él devuelve solo la identidad (útil antes de elegir
   * empresa, ej. /seleccionar-empresa).
   */
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Usuario autenticado y su membresía en la empresa activa',
    description:
      'Requiere Authorization: Bearer. Si se envía X-Company-Id, incluye ' +
      'rol y estado de la membresía en esa empresa (null si el usuario no ' +
      'es miembro); sin el header, devuelve solo la identidad.',
  })
  @ApiResponse({ status: 200, description: 'Usuario autenticado.' })
  @ApiResponse({ status: 401, description: 'Token de acceso inválido, expirado o de un usuario inexistente/inactivo.' })
  async me(
    @CurrentUserId() userId: string,
    @OptionalCompanyId() companyId: string | undefined,
  ) {
    try {
      return await this.getCurrentUserUseCase.execute({ userId, companyId });
    } catch (error) {
      if (error instanceof InvalidAccessTokenError) {
        throw new UnauthorizedException(error.message);
      }
      throw error;
    }
  }
}
