import { CashSessionEntity } from '../entities/cash-session.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface OpenCashSessionInput {
  cashRegisterId: string;
  openedByUserId: string;
  openingBalance: string;
}

export interface CloseCashSessionInput {
  closedByUserId: string;
  closingBalance: string;
  expectedBalance: string;
  difference: string;
}

export abstract class CashSessionRepository {
  abstract create(
    input: OpenCashSessionInput,
    ctx?: TransactionContext,
  ): Promise<CashSessionEntity>;
  abstract findById(
    id: string,
    companyId: string,
    ctx?: TransactionContext,
  ): Promise<CashSessionEntity | null>;
  abstract findOpenByCashRegister(
    cashRegisterId: string,
    ctx?: TransactionContext,
  ): Promise<CashSessionEntity | null>;
  /**
   * Escaneado por `companyId` además de `cashRegisterId` (auditoría de
   * seguridad, hallazgo A1): sin este filtro, un usuario de una empresa
   * podía listar las sesiones de una caja de otra empresa pasando su id.
   */
  abstract findAllByCashRegister(
    cashRegisterId: string,
    companyId: string,
  ): Promise<CashSessionEntity[]>;
  abstract close(
    id: string,
    input: CloseCashSessionInput,
    ctx?: TransactionContext,
  ): Promise<CashSessionEntity>;
}
