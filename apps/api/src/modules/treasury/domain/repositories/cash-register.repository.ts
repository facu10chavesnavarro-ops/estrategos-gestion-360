import { CashRegisterEntity } from '../entities/cash-register.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreateCashRegisterInput {
  companyId: string;
  branchId: string;
  name: string;
}

export interface UpdateCashRegisterInput {
  name?: string;
  accountId?: string | null;
}

export abstract class CashRegisterRepository {
  abstract create(
    input: CreateCashRegisterInput,
    ctx?: TransactionContext,
  ): Promise<CashRegisterEntity>;
  abstract findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<CashRegisterEntity | null>;
  /**
   * Escaneado por `companyId` además de `branchId` (auditoría de
   * seguridad, hallazgo A1): sin este filtro, un usuario de una empresa
   * podía listar las cajas de una sucursal de otra empresa pasando su id.
   */
  abstract findAllByBranch(branchId: string, companyId: string): Promise<CashRegisterEntity[]>;
  abstract update(
    id: string,
    input: UpdateCashRegisterInput,
    ctx?: TransactionContext,
  ): Promise<CashRegisterEntity>;
  abstract setActive(
    id: string,
    isActive: boolean,
    ctx?: TransactionContext,
  ): Promise<CashRegisterEntity>;
}
