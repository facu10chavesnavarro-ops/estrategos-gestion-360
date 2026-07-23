import { Injectable } from '@nestjs/common';
import { CompanyUserRepository } from '../../../companies/domain/repositories/company-user.repository';
import { CompanyMemberEntity } from '../../domain/entities/company-member.entity';

@Injectable()
export class ListCompanyMembersUseCase {
  constructor(private readonly companyUserRepository: CompanyUserRepository) {}

  async execute(companyId: string): Promise<CompanyMemberEntity[]> {
    const rows =
      await this.companyUserRepository.findAllByCompanyWithDetails(companyId);
    return rows.map(
      (row) =>
        new CompanyMemberEntity(
          row.userId,
          row.email,
          row.fullName,
          row.roleId,
          row.roleName,
          row.isActive,
        ),
    );
  }
}
