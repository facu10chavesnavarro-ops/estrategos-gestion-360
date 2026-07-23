import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenProviderPort } from '../../modules/auth/domain/repositories/token-provider.port';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard global (registrado en AppModule con APP_GUARD): por defecto,
 * TODO endpoint requiere autenticación. Se marca explícitamente lo público
 * con @Public() — es más seguro olvidarse de proteger algo (falla cerrado)
 * que exponerlo por descuido.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokenProvider: TokenProviderPort,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de acceso faltante');
    }

    const token = authHeader.slice('Bearer '.length);
    const payload = this.tokenProvider.verifyAccessToken(token);
    request.userId = payload.sub;
    request.userEmail = payload.email;
    return true;
  }
}
