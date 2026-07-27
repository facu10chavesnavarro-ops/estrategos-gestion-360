import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/persistence/prisma.service';
import { VoucherCounterRepository } from '../../domain/repositories/voucher-counter.repository';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';
import { resolveClient } from '../../../../common/infrastructure/persistence/resolve-client';

/**
 * RN-VOU-02: una sola sentencia SQL (INSERT ... ON CONFLICT DO UPDATE ...
 * RETURNING) evita el SELECT ... FOR UPDATE explícito — Postgres serializa
 * nativamente los UPDATE concurrentes sobre la misma fila. Debe llamarse
 * dentro de la transacción (`ctx`) que crea el Voucher: si la creación
 * falla después, el incremento revierte junto con ella (sin huecos).
 */
@Injectable()
export class PrismaVoucherCounterRepository extends VoucherCounterRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getNextNumber(
    companyId: string,
    pointOfSaleId: string,
    voucherTypeId: string,
    ctx: TransactionContext,
  ): Promise<number> {
    const client = resolveClient(this.prisma, ctx);
    const rows = await client.$queryRaw<{ last_number: number }[]>`
      INSERT INTO voucher_counters (company_id, point_of_sale_id, voucher_type_id, last_number)
      VALUES (${companyId}, ${pointOfSaleId}, ${voucherTypeId}, 1)
      ON CONFLICT (company_id, point_of_sale_id, voucher_type_id)
      DO UPDATE SET last_number = voucher_counters.last_number + 1
      RETURNING last_number
    `;
    return rows[0].last_number;
  }
}
