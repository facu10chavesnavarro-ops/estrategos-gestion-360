import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../persistence/prisma.service';

/**
 * Se aplica con @UseGuards(CompanyContextGuard) en cualquier controller que
 * opere sobre datos de una empresa (todos, a partir de Sprint 1).
 *
 * Regla dura (RN-001/RN-002 del documento fuente): ningún endpoint puede
 * devolver datos de una empresa no autorizada. Este guard es la primera de
 * las tres barreras descritas en docs/ARQUITECTURA.md sección 3 — las otras
 * dos (repositorio tipado + RLS de Postgres) se agregan en Sprint 1 junto
 * con las primeras entidades transaccionales.
 */
@Injectable()
export class CompanyContextGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.userId;
    const companyId = request.headers['x-company-id'] as string | undefined;

    if (!userId) {
      throw new ForbiddenException('No autenticado');
    }
    if (!companyId) {
      throw new ForbiddenException('Falta el encabezado X-Company-Id');
    }

    const membership = await this.prisma.companyUser.findUnique({
      where: { userId_companyId: { userId, companyId } },
      include: { role: true },
    });

    if (!membership || !membership.isActive) {
      // Una membresía desactivada (RN-USR-09) se trata igual que si no existiera:
      // no se distingue el motivo para no filtrar información a quien no tiene acceso.
      throw new ForbiddenException('No autorizado para esta empresa');
    }

    request.companyId = companyId;
    request.roleId = membership.roleId;
    request.roleName = membership.role.name;
    return true;
  }
}
