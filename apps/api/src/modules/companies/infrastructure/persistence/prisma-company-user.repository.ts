import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import { CompanyUserRepository } from '../../domain/repositories/company-user.repository';

@Injectable()
export class PrismaCompanyUserRepository extends CompanyUserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async hasRoleInTenant(
    userId: string,
    tenantId: string,
    roleNames: readonly string[],
  ): Promise<boolean> {
    const membership = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        role: { name: { in: [...roleNames] } },
        company: { tenantId },
      },
    });
    return membership !== null;
  }

  async addMembership(
    userId: string,
    companyId: string,
    roleName: string,
  ): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!role) {
      // Solo puede pasar por un dato de seed inconsistente, no por input de usuario.
      throw new NotFoundException(`Rol "${roleName}" no existe`);
    }
    await this.prisma.companyUser.create({
      data: { userId, companyId, roleId: role.id },
    });
  }
}
