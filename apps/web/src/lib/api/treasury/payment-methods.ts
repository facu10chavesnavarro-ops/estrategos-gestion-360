import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../http-client';
import { queryKeys } from '../query-keys';

/**
 * Catálogo global de plataforma (como VoucherType, F5) — sin companyId,
 * sin `[CTX]` en el backend. Las 6 filas reales sembradas: EFECTIVO,
 * CHEQUE, TRANSFERENCIA, TARJETA_DEBITO, TARJETA_CREDITO, CUENTA_CORRIENTE.
 */
export interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  requiresCheckDetail: boolean;
  requiresCardDetail: boolean;
  requiresCashMovement: boolean;
  requiresBankMovement: boolean;
  isActive: boolean;
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: queryKeys.treasury.paymentMethods(),
    queryFn: () => apiFetch<PaymentMethod[]>('payment-methods', ''),
  });
}
