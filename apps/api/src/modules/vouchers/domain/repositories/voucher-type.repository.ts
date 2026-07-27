import { VoucherTypeEntity } from '../entities/voucher-type.entity';
import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

/** Catálogo global de plataforma (como Role) — no pertenece a ninguna empresa. */
export abstract class VoucherTypeRepository {
  abstract findById(id: string, ctx?: TransactionContext): Promise<VoucherTypeEntity | null>;
  abstract findByCode(code: string): Promise<VoucherTypeEntity | null>;
  abstract findAllActive(): Promise<VoucherTypeEntity[]>;
}
