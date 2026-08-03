import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../http-client';
import { queryKeys } from '../query-keys';

export type VoucherFlow = 'SALE' | 'PURCHASE';
export type StockEffect = 'IN' | 'OUT' | 'NONE';
export type CurrentAccountEffect = 'DEBIT' | 'CREDIT' | 'NONE';

/**
 * Catálogo global de plataforma (como Role) — sin companyId, sin
 * `[CTX]` en el backend. Las 7 filas reales (FA_A/B/C, NC_A/B/C, FC) las
 * define exclusivamente este endpoint; el frontend nunca hardcodea tipos
 * ni asume que existe una Nota de Débito u otro código no sembrado.
 */
export interface VoucherType {
  id: string;
  code: string;
  name: string;
  flow: VoucherFlow;
  affectsStock: StockEffect;
  affectsCurrentAccount: CurrentAccountEffect;
  requiresCae: boolean;
  isCreditNote: boolean;
  relatedVoucherRequired: boolean;
  isActive: boolean;
}

export function useVoucherTypes() {
  return useQuery({
    queryKey: queryKeys.vouchers.voucherTypes(),
    queryFn: () => apiFetch<VoucherType[]>('voucher-types', ''),
  });
}
