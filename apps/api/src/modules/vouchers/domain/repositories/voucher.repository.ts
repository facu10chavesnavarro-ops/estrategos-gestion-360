import { VoucherEntity } from '../entities/voucher.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreateVoucherLineTaxInput {
  taxId: string;
  rate: string;
  amount: string;
}

export interface CreateVoucherLineInput {
  id: string;
  lineNumber: number;
  itemId?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountPercentage?: string;
  subtotal: string;
  taxes: CreateVoucherLineTaxInput[];
}

export interface CreateVoucherInput {
  id: string;
  companyId: string;
  branchId: string;
  pointOfSaleId: string;
  voucherTypeId: string;
  number: number;
  partyId: string;
  warehouseId?: string;
  issueDate: Date;
  currency: string;
  exchangeRate: string;
  relatedVoucherId?: string;
  subtotal: string;
  taxTotal: string;
  total: string;
  createdByUserId: string;
  lines: CreateVoucherLineInput[];
}

export interface ListVouchersFilters {
  partyId?: string;
  voucherTypeId?: string;
  from?: Date;
  to?: Date;
}

export abstract class VoucherRepository {
  abstract create(input: CreateVoucherInput, ctx?: TransactionContext): Promise<VoucherEntity>;
  abstract findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<VoucherEntity | null>;
  abstract findAllByCompany(
    companyId: string,
    filters: ListVouchersFilters,
  ): Promise<VoucherEntity[]>;
}
