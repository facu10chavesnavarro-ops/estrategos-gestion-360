import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import {
  CompanyUserRepository,
  CompanyMembership,
  CompanyMembershipStatus,
} from '../../domain/repositories/company-user.repository';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

@Injectable()
export class PrismaCompanyUserRepository extends CompanyUserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async hasRoleInTenant(
    userId: string,
    tenantId: string,
    roleNames: readonly string[],
    ctx?: TransactionContext,
  ): Promise<boolean> {
    const membership = await resolveClient(this.prisma, ctx).companyUser.findFirst({
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
    ctx?: TransactionContext,
  ): Promise<void> {
    const client = resolveClient(this.prisma, ctx);
    const role = await client.role.findUnique({ where: { name: roleName } });
    if (!role) {
      // Solo puede pasar por un dato de seed inconsistente, no por input de usuario.
      throw new NotFoundException(`Rol "${roleName}" no existe`);
    }
    await client.companyUser.create({
      data: { userId, companyId, roleId: role.id },
    });
  }

  async hasActiveMembershipByEmail(
    email: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<boolean> {
    const membership = await resolveClient(this.prisma, ctx).companyUser.findFirst({
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
    ctx?: TransactionContext,
  ): Promise<CompanyMembershipStatus | null> {
    const row = await resolveClient(this.prisma, ctx).companyUser.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });
    return row ? { roleId: row.roleId, isActive: row.isActive } : null;
  }

  async updateRole(
    userId: string,
    companyId: string,
    roleId: string,
    ctx?: TransactionContext,
  ): Promise<void> {
    await resolveClient(this.prisma, ctx).companyUser.update({
      where: { userId_companyId: { userId, companyId } },
      data: { roleId },
    });
  }

  async setActive(
    userId: string,
    companyId: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<void> {
    await resolveClient(this.prisma, ctx).companyUser.update({
      where: { userId_companyId: { userId, companyId } },
      data: { isActive },
    });
  }
}
