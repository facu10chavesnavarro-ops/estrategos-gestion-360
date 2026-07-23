import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Se usa junto a CompanyContextGuard. Devuelve el companyId ya validado
 * contra las empresas autorizadas del usuario (header X-Company-Id).
 */
export const CurrentCompanyId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.companyId;
  },
);
