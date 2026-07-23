import { BadRequestException } from '@nestjs/common';

/**
 * El :id de la URL y el header X-Company-Id (resuelto por CompanyContextGuard)
 * deben referirse a la misma empresa. Evita que alguien mande un X-Company-Id
 * válido para SU empresa pero un :id de otra empresa en la URL.
 */
export function assertSameCompany(
  pathCompanyId: string,
  contextCompanyId: string,
): void {
  if (pathCompanyId !== contextCompanyId) {
    throw new BadRequestException(
      'El id de la URL no coincide con la empresa del encabezado X-Company-Id',
    );
  }
}
