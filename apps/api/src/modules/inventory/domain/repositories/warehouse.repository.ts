import { WarehouseEntity } from '../entities/warehouse.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreateWarehouseInput {
  companyId: string;
  branchId: string;
  name: string;
}

export interface UpdateWarehouseInput {
  name?: string;
}

export abstract class WarehouseRepository {
  abstract create(
    input: CreateWarehouseInput,
    ctx?: TransactionContext,
  ): Promise<WarehouseEntity>;
  abstract findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<WarehouseEntity | null>;
  abstract findByBranchAndName(
    branchId: string,
    name: string,
    ctx?: TransactionContext,
  ): Promise<WarehouseEntity | null>;
  abstract findAllByBranch(branchId: string): Promise<WarehouseEntity[]>;
  abstract update(
    id: string,
    input: UpdateWarehouseInput,
    ctx?: TransactionContext,
  ): Promise<WarehouseEntity>;
  abstract setActive(
    id: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<WarehouseEntity>;
}
