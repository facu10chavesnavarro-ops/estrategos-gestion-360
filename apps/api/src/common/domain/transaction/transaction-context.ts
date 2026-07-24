declare const TRANSACTION_CONTEXT_BRAND: unique symbol;

/**
 * Handle opaco de una transacción en curso. El dominio y la aplicación lo
 * reciben y lo vuelven a pasar sin saber qué hay adentro — solo la
 * infraestructura (repositorios Prisma) sabe que en runtime es un
 * `Prisma.TransactionClient` y lo castea de vuelta ahí. Ver
 * docs/arquitectura/unit-of-work-y-transacciones.md.
 */
export interface TransactionContext {
  readonly [TRANSACTION_CONTEXT_BRAND]: never;
}
