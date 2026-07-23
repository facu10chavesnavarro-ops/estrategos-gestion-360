import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Se usa junto a CompanyContextGuard. Devuelve el nombre del rol del usuario
 * en la empresa del header X-Company-Id (ver Role.name, sembrado en Sprint 0).
 */
export const CurrentRoleName = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.roleName;
  },
);
