import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenProviderPort } from '../../modules/auth/domain/repositories/token-provider.port';
import { UserRepository } from '../../modules/auth/domain/repositories/user.repository';
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
    private readonly userRepository: UserRepository,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
    let payload: ReturnType<TokenProviderPort['verifyAccessToken']>;
    try {
      payload = this.tokenProvider.verifyAccessToken(token);
    } catch {
      // verifyAccessToken lanza un error de dominio (token inválido/expirado);
      // sin este catch quedaba sin traducir y devolvía 500 en vez de 401.
      throw new UnauthorizedException('Token de acceso inválido o expirado');
    }

    // Auditoría de seguridad (hallazgo Bajo #7): logout invalida todos los
    // access tokens en circulación del usuario, no solo el refresh token de
    // esa sesión — un token robado deja de servir apenas la víctima cierra
    // sesión, en vez de seguir válido hasta su expiración natural (15 min).
    //
    // Se compara con iatMs (ms), no con el `iat` estándar del JWT (solo
    // segundo, así lo define el spec) — con precisión de segundo, un
    // re-login legítimo que cae en el mismo segundo que un logout previo
    // podía quedar indistinguible de un token viejo robado, y cualquiera de
    // las dos formas de resolver esa ambigüedad rompía un caso real (se
    // encontró en integración: rechazaba el re-login inmediato, o aceptaba
    // el token viejo, según para qué lado se redondeara). iatMs falta solo
    // en tokens firmados antes de este cambio — se los deja pasar sin
    // chequear invalidación, ya expiran solos en ≤15 min.
    if (payload.iatMs) {
      const invalidatedAt = await this.userRepository.getTokensInvalidatedAt(payload.sub);
      if (invalidatedAt && payload.iatMs < invalidatedAt.getTime()) {
        throw new UnauthorizedException('Token de acceso inválido o expirado');
      }
    }

    request.userId = payload.sub;
    request.userEmail = payload.email;
    return true;
  }
}
