import { BranchEntity } from '../entities/branch.entity';

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
  abstract create(input: CreateBranchInput): Promise<BranchEntity>;
  abstract findById(id: string): Promise<BranchEntity | null>;
  abstract findAllByCompany(companyId: string): Promise<BranchEntity[]>;
  abstract update(id: string, input: UpdateBranchInput): Promise<BranchEntity>;
  abstract setActive(id: string, isActive: boolean): Promise<BranchEntity>;
}
