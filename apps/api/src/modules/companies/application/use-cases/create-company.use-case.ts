import { Injectable } from '@nestjs/common';
import { CompanyRepository } from '../../domain/repositories/company.repository';
import { CompanyUserRepository } from '../../domain/repositories/company-user.repository';
import { AuditLogRepository } from '../../../../common/domain/repositories/audit-log.repository';
import { CompanyEntity } from '../../domain/entities/company.entity';
import { CreateCompanyUseCaseInput } from '../dto/company.dto';
import { InvalidTaxIdError } from '../../domain/errors/company.errors';
import { isValidTaxId } from '../../../../common/domain/rules/tax-id.validator';
import {
  ROLES_THAT_CAN_CREATE_COMPANY,
  DEFAULT_ROLE_FOR_COMPANY_CREATOR,
} from '../../../../common/domain/rules/company-roles';
import { RoleNotAuthorizedError } from '../../../../common/domain/errors/authorization.error';

/** RN-EMP-03, RN-EMP-05, RN-EMP-08. */
@Injectable()
export class CreateCompanyUseCase {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly companyUserRepository: CompanyUserRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: CreateCompanyUseCaseInput): Promise<CompanyEntity> {
    const isAuthorized = await this.companyUserRepository.hasRoleInTenant(
      input.requestingUserId,
      input.tenantId,
      ROLES_THAT_CAN_CREATE_COMPANY,
    );
    if (!isAuthorized) {
      throw new RoleNotAuthorizedError();
    }

    if (input.taxId && !isValidTaxId(input.taxId)) {
      throw new InvalidTaxIdError();
    }

    const company = await this.companyRepository.create({
      tenantId: input.tenantId,
      legalName: input.legalName,
      taxId: input.taxId,
      taxCondition: input.taxCondition,
      activity: input.activity,
      address: input.address,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      logoUrl: input.logoUrl,
      currency: input.currency,
      timezone: input.timezone,
    });

    await this.companyUserRepository.addMembership(
      input.requestingUserId,
      company.id,
      DEFAULT_ROLE_FOR_COMPANY_CREATOR,
    );

    await this.auditLogRepository.record({
      companyId: company.id,
      userId: input.requestingUserId,
      action: 'company.create',
      entityType: 'Company',
      entityId: company.id,
      metadata: { legalName: company.legalName },
    });

    return company;
  }
}
