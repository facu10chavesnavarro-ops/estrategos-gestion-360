import { Prisma } from '@prisma/client';
import { PrismaService } from '../../persistence/prisma.service';
import { TransactionContext } from '../../domain/transaction/transaction-context';

/**
 * Cada repositorio Prisma llama esto en vez de usar `this.prisma`
 * directamente, para participar transparentemente en la transacción activa
 * (si `ctx` viene de un `UnitOfWork.run`) o usar la conexión normal (si no).
 */
export function resolveClient(
  prisma: PrismaService,
  ctx?: TransactionContext,
): PrismaService | Prisma.TransactionClient {
  return ctx ? (ctx as unknown as Prisma.TransactionClient) : prisma;
}
