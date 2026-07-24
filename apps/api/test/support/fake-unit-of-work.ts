import { UnitOfWork } from '../../src/common/domain/transaction/unit-of-work.port';
import { TransactionContext } from '../../src/common/domain/transaction/transaction-context';

export const FAKE_TRANSACTION_CONTEXT = {} as unknown as TransactionContext;

/**
 * Mock de UnitOfWork para specs unitarios: ejecuta el callback inmediatamente
 * con un TransactionContext falso, sin abrir ninguna transacción real. Permite
 * seguir probando la lógica de negocio sin base de datos, mientras se verifica
 * que cada repositorio se llama con ese mismo ctx.
 */
export function createFakeUnitOfWork(): jest.Mocked<UnitOfWork> {
  return {
    run: jest.fn((fn: (ctx: TransactionContext) => unknown) =>
      fn(FAKE_TRANSACTION_CONTEXT),
    ),
  } as unknown as jest.Mocked<UnitOfWork>;
}
