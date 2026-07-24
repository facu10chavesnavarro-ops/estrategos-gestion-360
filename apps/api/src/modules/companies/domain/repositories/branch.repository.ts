import { BranchEntity } from '../entities/branch.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreateBranchInput {
  companyId: string;
  name: string;
  address?: string;
  phone?: string;
}

export interface UpdateBranchInput {
  name?: string;
  address?: string;
  phone?: string;
}

export abstract class BranchRepository {
  abstract create(input: CreateBranchInput, ctx?: TransactionContext): Promise<BranchEntity>;
  abstract findById(id: string, ctx?: TransactionContext): Promise<BranchEntity | null>;
  abstract findAllByCompany(companyId: string): Promise<BranchEntity[]>;
  abstract update(
    id: string,
    input: UpdateBranchInput,
    ctx?: TransactionContext,
  ): Promise<BranchEntity>;
  abstract setActive(
    id: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<BranchEntity>;
}
