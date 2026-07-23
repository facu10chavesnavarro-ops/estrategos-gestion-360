import { ImportMode } from '../../../../common/domain/import/import.types';

export interface CreateSupplierUseCaseInput {
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
  bankName?: string;
  bankAccountHolder?: string;
  bankCbu?: string;
}

export interface UpdateSupplierUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  supplierId: string;
  legalName?: string;
  taxId?: string;
  taxCondition?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactName?: string;
  notes?: string;
  paymentTermDays?: number;
  bankName?: string;
  bankAccountHolder?: string;
  bankCbu?: string;
}

export interface ChangeSupplierStateUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  supplierId: string;
}

export interface ListSuppliersUseCaseInput {
  companyId: string;
  search?: string;
  isActive?: boolean;
}

export interface ImportSuppliersUseCaseInput {
  requestingUserId: string;
  requestingRoleName: string;
  companyId: string;
  csvContent: string;
  mode: ImportMode;
}
