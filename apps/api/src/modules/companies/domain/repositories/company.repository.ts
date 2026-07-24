import { CompanyEntity } from '../entities/company.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreateCompanyInput {
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

export interface UpdateCompanyInput {
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

export abstract class CompanyRepository {
  abstract create(input: CreateCompanyInput, ctx?: TransactionContext): Promise<CompanyEntity>;
  /** Solo empresas a las que el usuario tiene acceso vía company_users (RN-002). */
  abstract findAllForUser(userId: string): Promise<CompanyEntity[]>;
  abstract findById(id: string, ctx?: TransactionContext): Promise<CompanyEntity | null>;
  abstract update(
    id: string,
    input: UpdateCompanyInput,
    ctx?: TransactionContext,
  ): Promise<CompanyEntity>;
  abstract setActive(
    id: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<CompanyEntity>;
}
