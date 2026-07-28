import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RefreshSessionUseCase } from '../../application/use-cases/refresh-session.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import {
  LoginRequestDto,
  RefreshRequestDto,
} from '../dto/login-request.dto';
import {
  InvalidCredentialsError,
  UserInactiveError,
  InvalidRefreshTokenError,
} from '../../domain/errors/auth.errors';
import { Public } from '../../../../common/decorators/public.decorator';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Devuelve un access token (corta duración) y un refresh token ' +
      '(rotable) junto con los datos básicos del usuario. No requiere ' +
      'X-Company-Id: la selección de empresa es un paso posterior, vía ' +
      'GET /companies para listar las empresas del usuario.',
  })
  @ApiResponse({ status: 200, description: 'Credenciales válidas.' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas o usuario inactivo.' })
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
}
