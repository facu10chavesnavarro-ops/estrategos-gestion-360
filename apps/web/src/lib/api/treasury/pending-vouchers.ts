import { useVouchers } from '../vouchers/vouchers';
import { useVoucherTypes, type VoucherFlow } from '../vouchers/voucher-types';
import { usePayments } from './payments';

/**
 * Comprobantes pendientes y vencidos de una contraparte (F6 §3.2 del
 * doc de arquitectura) — el backend no tiene ningún campo de estado ni
 * de vencimiento en Voucher, así que se deriva acá cruzando
 * GET vouchers (totales) + GET payments (allocations con voucherId +
 * amountApplied), decisión escalada y aprobada explícitamente. Se
 * trabaja en centavos enteros para evitar artefactos de punto flotante
 * al sumar/restar montos.
 */
export interface PendingVoucherRow {
  voucherId: string;
  voucherTypeCode: string;
  voucherTypeName: string;
  number: number;
  issueDate: string;
  total: string;
  paidAmount: string;
  pendingAmount: string;
  isOverdue: boolean;
}

function toCents(amount: string): number {
  const n = Number(amount);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function usePendingVouchers(
  companyId: string,
  partyId: string,
  flow: VoucherFlow,
  /** Customer.paymentTermDays / Supplier.paymentTermDays — null = contado, sin vencimiento derivable. */
  paymentTermDays: number | null,
) {
  const vouchers = useVouchers(companyId, { partyId }, { enabled: Boolean(partyId) });
  const voucherTypes = useVoucherTypes();
  const payments = usePayments(companyId, { partyId }, { enabled: Boolean(partyId) });

  const isLoading = vouchers.isLoading || voucherTypes.isLoading || payments.isLoading;

  const typeById = new Map((voucherTypes.data ?? []).map((t) => [t.id, t]));

  const paidCentsByVoucherId = new Map<string, number>();
  (payments.data ?? []).forEach((p) => {
    p.allocations.forEach((a) => {
      paidCentsByVoucherId.set(
        a.voucherId,
        (paidCentsByVoucherId.get(a.voucherId) ?? 0) + toCents(a.amountApplied),
      );
    });
  });

  const today = new Date();

  const rows: PendingVoucherRow[] = (vouchers.data ?? [])
    .filter((v) => {
      const type = typeById.get(v.voucherTypeId);
      // Las Notas de Crédito ya ajustaron la cuenta corriente directamente
      // al crearse (F5) — no son un comprobante que se "cobre/pague" vía
      // imputación de un Payment, así que no aparecen como pendientes.
      return type?.flow === flow && !type.isCreditNote;
    })
    .map((v) => {
      const type = typeById.get(v.voucherTypeId);
      const totalCents = toCents(v.total);
      const paidCents = paidCentsByVoucherId.get(v.id) ?? 0;
      const pendingCents = totalCents - paidCents;
      const dueDate =
        paymentTermDays !== null ? new Date(new Date(v.issueDate).getTime() + paymentTermDays * DAY_MS) : null;
      const isOverdue = pendingCents > 0 && dueDate !== null && dueDate.getTime() < today.getTime();
      return {
        voucherId: v.id,
        voucherTypeCode: type?.code ?? '—',
        voucherTypeName: type?.name ?? '—',
        number: v.number,
        issueDate: v.issueDate,
        total: v.total,
        paidAmount: fromCents(paidCents),
        pendingAmount: fromCents(pendingCents),
        isOverdue,
      };
    })
    .filter((row) => Number(row.pendingAmount) > 0);

  return { rows, isLoading };
}
