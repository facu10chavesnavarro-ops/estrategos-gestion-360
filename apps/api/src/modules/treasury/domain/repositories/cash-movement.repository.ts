import { CashMovementEntity, CashMovementType } from '../entities/cash-movement.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

export interface CreateCashMovementInput {
  id: string;
  cashSessionId: string;
  type: CashMovementType;
  amount: string;
  paymentId?: string;
  reason?: string;
}

export abstract class CashMovementRepository {
  abstract create(
    input: CreateCashMovementInput,
    ctx?: TransactionContext,
  ): Promise<CashMovementEntity>;
  /**
   * Escaneado por `companyId` además de `cashSessionId` (auditoría de
   * seguridad, hallazgo A1): sin este filtro, un usuario de una empresa
   * podía listar los movimientos de una sesión de otra empresa pasando
   * su id.
   */
  abstract findAllBySession(
    cashSessionId: string,
    companyId: string,
  ): Promise<CashMovementEntity[]>;
  abstract sumAmountBySessionAndType(
    cashSessionId: string,
    type: CashMovementType,
    ctx?: TransactionContext,
  ): Promise<string>;
}
