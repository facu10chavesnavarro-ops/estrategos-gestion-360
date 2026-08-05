import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../http-client';
import { queryKeys } from '../query-keys';
import { useCustomers } from '../customers';
import { useSuppliers } from '../suppliers';

export type PaymentDirection = 'COLLECTION' | 'PAYMENT';
export type CheckStatus = 'EN_CARTERA' | 'DEPOSITADO' | 'RECHAZADO' | 'COBRADO';

export interface CheckDetail {
  id: string;
  number: string;
  bankName: string;
  dueDate: string;
  status: CheckStatus;
}

export interface CardDetail {
  id: string;
  authorizationCode: string | null;
  batchNumber: string | null;
  settlementEntity: string | null;
}

export interface PaymentMethodDetail {
  id: string;
  paymentMethodId: string;
  amount: string;
  reference: string | null;
  checkDetail: CheckDetail | null;
  cardDetail: CardDetail | null;
}

export interface PaymentAllocation {
  voucherId: string;
  amountApplied: string;
}

/**
 * `partyId` es el id de Party, no de Customer/Supplier — igual que en
 * Voucher (F5). Usar `customer.partyId`/`supplier.partyId`. Sin campo
 * de estado: un Payment es inmutable, no hay anulación (ver
 * docs/frontend/09-sprint-f6-tesoreria.md §3.3).
 */
export interface Payment {
  id: string;
  companyId: string;
  partyId: string;
  direction: PaymentDirection;
  date: string;
  currency: string;
  exchangeRate: string;
  totalAmount: string;
  createdByUserId: string;
  createdAt: string;
  allocations: PaymentAllocation[];
  methodDetails: PaymentMethodDetail[];
  idempotencyKey: string | null;
}

export interface PaymentFilters {
  partyId?: string;
  direction?: PaymentDirection;
  from?: string;
  to?: string;
}

export interface CreateCheckDetailInput {
  number: string;
  bankName: string;
  dueDate: string;
}

export interface CreateCardDetailInput {
  authorizationCode?: string;
  batchNumber?: string;
  settlementEntity?: string;
}

export interface CreatePaymentMethodDetailInput {
  paymentMethodId: string;
  amount: string;
  reference?: string;
  checkDetail?: CreateCheckDetailInput;
  cardDetail?: CreateCardDetailInput;
}

export interface CreatePaymentAllocationInput {
  voucherId: string;
  amountApplied: string;
}

export interface CreatePaymentInput {
  partyId: string;
  direction: PaymentDirection;
  date?: string;
  currency?: string;
  exchangeRate?: string;
  methodDetails: CreatePaymentMethodDetailInput[];
  allocations?: CreatePaymentAllocationInput[];
  cashSessionId?: string;
  bankAccountId?: string;
  /**
   * RN-PAY-11 (backend, CHANGELOG [1.3.0]): id generado por el cliente,
   * uno por intento de envío (ver useIdempotencyKey). Si se reintenta
   * con la misma clave, el backend devuelve el pago ya creado en vez de
   * duplicarlo — protección real, no solo deshabilitar el botón.
   */
  idempotencyKey?: string;
}

function paymentsQueryString(filters: PaymentFilters): string {
  const params = new URLSearchParams();
  if (filters.partyId) params.set('partyId', filters.partyId);
  if (filters.direction) params.set('direction', filters.direction);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function usePayments(
  companyId: string,
  filters: PaymentFilters,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.treasury.list(companyId, filters),
    queryFn: () =>
      apiFetch<Payment[]>(`companies/${companyId}/payments${paymentsQueryString(filters)}`, companyId),
    enabled: Boolean(companyId) && (options?.enabled ?? true),
  });
}

export function usePayment(companyId: string, paymentId: string) {
  return useQuery({
    queryKey: queryKeys.treasury.detail(companyId, paymentId),
    queryFn: () => apiFetch<Payment>(`companies/${companyId}/payments/${paymentId}`, companyId),
    enabled: Boolean(companyId) && Boolean(paymentId),
  });
}

/**
 * Sin `retry`: aunque el backend ya deduplica por idempotencyKey (RN-PAY-11),
 * un reintento automático de TanStack Query no aporta nada útil acá —
 * si falló por un error de validación real, reintentarlo solo would
 * repetirlo con el mismo resultado.
 */
export function useCreatePayment(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: (input: CreatePaymentInput) =>
      apiFetch<Payment>(`companies/${companyId}/payments`, companyId, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies', companyId, 'payments'] });
      // Un pago cambia el saldo de cuenta corriente y, potencialmente, el
      // pendiente de los comprobantes imputados — refrescar ambas vistas.
      queryClient.invalidateQueries({ queryKey: ['companies', companyId, 'customers'] });
      queryClient.invalidateQueries({ queryKey: ['companies', companyId, 'suppliers'] });
    },
  });
}

/**
 * Resuelve nombre de contraparte legible para el listado/detalle de
 * pagos — mismo criterio que useVouchersWithLabels (F5): `partyId` no
 * distingue por sí solo si es un Cliente o un Proveedor.
 */
export interface PaymentWithPartyName extends Payment {
  partyName: string;
}

export function usePaymentsWithLabels(companyId: string, filters: PaymentFilters) {
  const payments = usePayments(companyId, filters);
  const customers = useCustomers(companyId, {});
  const suppliers = useSuppliers(companyId, {});

  const isLoading = payments.isLoading || customers.isLoading || suppliers.isLoading;

  const partyNameById = new Map<string, string>();
  (customers.data ?? []).forEach((c) => partyNameById.set(c.partyId, c.legalName));
  (suppliers.data ?? []).forEach((s) => partyNameById.set(s.partyId, s.legalName));

  const rows: PaymentWithPartyName[] = (payments.data ?? []).map((p) => ({
    ...p,
    partyName: partyNameById.get(p.partyId) ?? p.partyId,
  }));

  return { rows, isLoading };
}
