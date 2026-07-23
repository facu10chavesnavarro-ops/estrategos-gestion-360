export interface CreateCompanyUseCaseInput {
  requestingUserId: string;
  tenantId: string;
  legalName: string;
  taxId?: string;
  taxCondition?: string;
  activity?: string;
  address?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
  currency?: string;
  timezone?: string;
}

export interface UpdateCompanyUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  legalName?: string;
  taxId?: string;
  taxCondition?: string;
  activity?: string;
  address?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
  currency?: string;
  timezone?: string;
}

export interface ChangeCompanyStateUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  reason?: string;
}
