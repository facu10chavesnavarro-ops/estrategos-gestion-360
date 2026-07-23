import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  CompanyUserRepository,
  CompanyMembership,
  CompanyMembershipStatus,
} from '../../domain/repositories/company-user.repository';

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

  async hasActiveMembershipByEmail(
    email: string,
    companyId: string,
  ): Promise<boolean> {
    const membership = await this.prisma.companyUser.findFirst({
      where: { companyId, isActive: true, user: { email } },
    });
    return membership !== null;
  }

  async findAllByCompanyWithDetails(
    companyId: string,
  ): Promise<CompanyMembership[]> {
    const rows = await this.prisma.companyUser.findMany({
      where: { companyId },
      include: { user: true, role: true },
    });
    return rows.map((row) => ({
      userId: row.userId,
      email: row.user.email,
      fullName: row.user.fullName,
      roleId: row.roleId,
      roleName: row.role.name,
      isActive: row.isActive,
    }));
  }

  async findMembership(
    userId: string,
    companyId: string,
  ): Promise<CompanyMembershipStatus | null> {
    const row = await this.prisma.companyUser.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });
    return row ? { roleId: row.roleId, isActive: row.isActive } : null;
  }

  async updateRole(
    userId: string,
    companyId: string,
    roleId: string,
  ): Promise<void> {
    await this.prisma.companyUser.update({
      where: { userId_companyId: { userId, companyId } },
      data: { roleId },
    });
  }

  async setActive(
    userId: string,
    companyId: string,
    isActive: boolean,
  ): Promise<void> {
    await this.prisma.companyUser.update({
      where: { userId_companyId: { userId, companyId } },
      data: { isActive },
    });
  }
}
