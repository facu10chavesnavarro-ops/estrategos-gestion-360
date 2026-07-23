import { SupplierEntity } from '../entities/supplier.entity';

export interface CreateSupplierInput {
  partyId: string;
  companyId: string;
  paymentTermDays?: number;
  bankName?: string;
  bankAccountHolder?: string;
  bankCbu?: string;
}

export interface UpdateSupplierInput {
  paymentTermDays?: number;
  bankName?: string;
  bankAccountHolder?: string;
  bankCbu?: string;
}

export interface ListSuppliersFilters {
  search?: string;
  isActive?: boolean;
}

export abstract class SupplierRepository {
  abstract create(input: CreateSupplierInput): Promise<SupplierEntity>;
  abstract findById(id: string, companyId: string): Promise<SupplierEntity | null>;
  abstract findByPartyId(partyId: string): Promise<SupplierEntity | null>;
  abstract findAllByCompany(
    companyId: string,
    filters: ListSuppliersFilters,
  ): Promise<SupplierEntity[]>;
  abstract update(id: string, input: UpdateSupplierInput): Promise<SupplierEntity>;
  abstract setActive(id: string, isActive: boolean): Promise<SupplierEntity>;
}
