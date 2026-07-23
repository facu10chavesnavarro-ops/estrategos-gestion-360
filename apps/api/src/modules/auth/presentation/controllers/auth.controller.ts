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

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
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
}
