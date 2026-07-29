import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * A diferencia de @CurrentCompanyId(), no depende de CompanyContextGuard
 * (que exige el header y lanza si falta) — para endpoints donde la
 * empresa activa es opcional, como GET /auth/me.
 */
export const OptionalCompanyId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-company-id'] as string | undefined;
  },
);
