import { TransactionContext } from '../../../../common/domain/transaction/transaction-context';

/**
 * RN-VOU-02: incremento atómico y sin huecos por (companyId, pointOfSaleId,
 * voucherTypeId). Debe invocarse dentro de la misma transacción que crea el
 * `Voucher` — si la creación falla después, el incremento revierte con ella.
 */
export abstract class VoucherCounterRepository {
  abstract getNextNumber(
    companyId: string,
    pointOfSaleId: string,
    voucherTypeId: string,
    ctx: TransactionContext,
  ): Promise<number>;
}
