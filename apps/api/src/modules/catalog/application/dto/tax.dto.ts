import { TaxType } from '../../domain/entities/tax.entity';

export interface CreateTaxUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  name: string;
  type: TaxType;
  rate: string;
  validFrom?: string;
  validTo?: string;
}

export interface UpdateTaxUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  taxId: string;
  name: string;
}

export interface CloseTaxUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  taxId: string;
}

export interface ListTaxesUseCaseInput {
  companyId: string;
  onlyCurrentlyValid?: boolean;
}
