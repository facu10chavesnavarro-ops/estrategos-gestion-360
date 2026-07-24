import { TransactionContext } from './transaction-context';

/**
 * Patrón estándar del proyecto para operaciones multi-tabla (Empresas,
 * Usuarios, Clientes, Proveedores, y todo módulo futuro: Ventas, Compras,
 * Tesorería, Inventario, Contabilidad). Ver
 * docs/arquitectura/unit-of-work-y-transacciones.md.
 */
export abstract class UnitOfWork {
  abstract run<T>(fn: (ctx: TransactionContext) => Promise<T>): Promise<T>;
}
