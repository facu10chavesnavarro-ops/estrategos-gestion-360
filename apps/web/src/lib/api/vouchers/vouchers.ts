import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../http-client';
import { queryKeys } from '../query-keys';
import { useCustomers } from '../customers';
import { useSuppliers } from '../suppliers';
import { useVoucherTypes, type VoucherType } from './voucher-types';

export interface VoucherLineTax {
  taxId: string;
  rate: string;
  amount: string;
}

export interface VoucherLine {
  id: string;
  lineNumber: number;
  itemId: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
  discountPercentage: string;
  subtotal: string;
  taxes: VoucherLineTax[];
}

/**
 * `partyId` es el id de `Party`, no de `Customer`/`Supplier` — usar
 * `customer.partyId`/`supplier.partyId` (F2) al armar filtros o el DTO de
 * creación. Ver docs/frontend/08-sprint-f5-comprobantes.md §2.1/§3.3.
 */
export interface Voucher {
  id: string;
  companyId: string;
  branchId: string;
  pointOfSaleId: string;
  voucherTypeId: string;
  number: number;
  partyId: string;
  warehouseId: string | null;
  issueDate: string;
  currency: string;
  exchangeRate: string;
  relatedVoucherId: string | null;
  subtotal: string;
  taxTotal: string;
  total: string;
  cae: string | null;
  caeExpirationDate: string | null;
  createdByUserId: string;
  createdAt: string;
  lines: VoucherLine[];
}

export interface VoucherFilters {
  partyId?: string;
  voucherTypeId?: string;
  from?: string;
  to?: string;
}

export interface CreateVoucherLineInput {
  itemId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountPercentage?: string;
}

export interface CreateVoucherInput {
  branchId: string;
  pointOfSaleId: string;
  voucherTypeId: string;
  partyId: string;
  warehouseId?: string;
  issueDate?: string;
  relatedVoucherId?: string;
  lines: CreateVoucherLineInput[];
}

function vouchersQueryString(filters: VoucherFilters): string {
  const params = new URLSearchParams();
  if (filters.partyId) params.set('partyId', filters.partyId);
  if (filters.voucherTypeId) params.set('voucherTypeId', filters.voucherTypeId);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * `options.enabled` deja que el llamador sume una condición extra a la
 * consulta (ej. el picker de "comprobante a corregir" de una Nota de
 * Crédito, que no debe traer TODOS los comprobantes de la empresa hasta
 * que el usuario eligió tipo NC + contraparte).
 */
export function useVouchers(companyId: string, filters: VoucherFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.vouchers.list(companyId, filters),
    queryFn: () =>
      apiFetch<Voucher[]>(`companies/${companyId}/vouchers${vouchersQueryString(filters)}`, companyId),
    enabled: Boolean(companyId) && (options?.enabled ?? true),
  });
}

export function useVoucher(companyId: string, voucherId: string) {
  return useQuery({
    queryKey: queryKeys.vouchers.detail(companyId, voucherId),
    queryFn: () => apiFetch<Voucher>(`companies/${companyId}/vouchers/${voucherId}`, companyId),
    enabled: Boolean(companyId) && Boolean(voucherId),
  });
}

/**
 * `partyId` no distingue por sí solo si es un Cliente o un Proveedor, y
 * `voucherTypeId` es solo un id — el listado y el detalle necesitan
 * mostrar nombre de contraparte y tipo de comprobante legibles. Se
 * resuelve acá (no en cada pantalla) porque tanto el listado (§5.2) como
 * el detalle (§5.3) y el picker de "comprobante a corregir" de una Nota
 * de Crédito (§3.6) necesitan la misma resolución.
 */
export interface VoucherWithLabels extends Voucher {
  voucherType: VoucherType | undefined;
  partyName: string;
}

export function useVouchersWithLabels(companyId: string, filters: VoucherFilters) {
  const vouchers = useVouchers(companyId, filters);
  const voucherTypes = useVoucherTypes();
  const customers = useCustomers(companyId, {});
  const suppliers = useSuppliers(companyId, {});

  const isLoading =
    vouchers.isLoading || voucherTypes.isLoading || customers.isLoading || suppliers.isLoading;

  const typeById = new Map((voucherTypes.data ?? []).map((t) => [t.id, t]));
  const partyNameById = new Map<string, string>();
  (customers.data ?? []).forEach((c) => partyNameById.set(c.partyId, c.legalName));
  (suppliers.data ?? []).forEach((s) => partyNameById.set(s.partyId, s.legalName));

  const rows: VoucherWithLabels[] = (vouchers.data ?? []).map((v) => ({
    ...v,
    voucherType: typeById.get(v.voucherTypeId),
    partyName: partyNameById.get(v.partyId) ?? v.partyId,
  }));

  return { rows, isLoading };
}

/**
 * Sin `retry`: el backend no tiene protección contra doble-submit (sin
 * idempotency key) — un reintento automático de red generaría un segundo
 * comprobante real, con su propio movimiento de stock y asiento contable.
 * La mitigación aprobada para F5 es solo de frontend (ver §3.1.1 del doc
 * de arquitectura): esta mutación nunca reintenta sola, y el formulario
 * deshabilita el botón de confirmar mientras `isSubmitting`.
 */
export function useCreateVoucher(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: (input: CreateVoucherInput) =>
      apiFetch<Voucher>(`companies/${companyId}/vouchers`, companyId, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies', companyId, 'vouchers'] });
    },
  });
}
