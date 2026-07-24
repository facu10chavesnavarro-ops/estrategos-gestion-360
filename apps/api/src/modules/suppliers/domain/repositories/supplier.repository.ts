import { SupplierEntity } from '../entities/supplier.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

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
  abstract create(input: CreateSupplierInput, ctx?: TransactionContext): Promise<SupplierEntity>;
  abstract findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<SupplierEntity | null>;
  abstract findByPartyId(
    partyId: string,
    ctx?: TransactionContext,
  ): Promise<SupplierEntity | null>;
  abstract findAllByCompany(
    companyId: string,
    filters: ListSuppliersFilters,
  ): Promise<SupplierEntity[]>;
  abstract update(
    id: string,
    input: UpdateSupplierInput,
    ctx?: TransactionContext,
  ): Promise<SupplierEntity>;
  abstract setActive(
    id: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<SupplierEntity>;
}
