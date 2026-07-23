import { ImportMode } from '../../../../common/domain/import/import.types';

export interface CreateCustomerUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  legalName: string;
  taxId?: string;
  taxCondition?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactName?: string;
  notes?: string;
  paymentTermDays?: number;
  creditLimit?: string;
}

export interface UpdateCustomerUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  customerId: string;
  legalName?: string;
  taxId?: string;
  taxCondition?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactName?: string;
  notes?: string;
  paymentTermDays?: number;
  creditLimit?: string;
}

export interface ChangeCustomerStateUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  customerId: string;
}

export interface ListCustomersUseCaseInput {
  companyId: string;
  search?: string;
  isActive?: boolean;
}

export interface ImportCustomersUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  csvContent: string;
  mode: ImportMode;
}
