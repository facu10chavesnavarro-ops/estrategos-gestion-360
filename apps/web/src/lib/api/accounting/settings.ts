import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '../http-client';
import { queryKeys } from '../query-keys';

/**
 * Una fila por empresa (§2.1, docs/frontend/11-sprint-f8-contabilidad.md).
 * Solo dos "cuentas de control", compartidas por todos los clientes y
 * todos los proveedores — no existe mapeo por tercero individual (§3.7).
 */
export interface AccountingSettings {
  companyId: string;
  accountsReceivableId: string;
  accountsPayableId: string;
}

export interface UpdateAccountingSettingsInput {
  accountsReceivableId?: string;
  accountsPayableId?: string;
}

export type PaymentMethodAccountDirection = 'COLLECTION' | 'PAYMENT';

export interface PaymentMethodAccountMapping {
  companyId: string;
  paymentMethodId: string;
  direction: PaymentMethodAccountDirection;
  accountId: string;
}

export interface SetPaymentMethodAccountMappingInput {
  paymentMethodId: string;
  direction: PaymentMethodAccountDirection;
  accountId: string;
}

function invalidateAccountingSettingsQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string,
) {
  queryClient.invalidateQueries({ queryKey: ['companies', companyId, 'accounting-settings'] });
}

/**
 * 404 (`AccountingSettingsNotFoundError`) significa "todavía no
 * activada" — no un error real, mismo criterio que el estado "sin
 * activar" ya usado para Vouchers/Payments en F5/F6. `retry: false`
 * evita reintentar contra un 404 esperado.
 */
export function useAccountingSettings(companyId: string) {
  return useQuery({
    queryKey: queryKeys.accounting.settings(companyId),
    queryFn: () =>
      apiFetch<AccountingSettings>(`companies/${companyId}/accounting-settings`, companyId),
    enabled: Boolean(companyId),
    retry: false,
  });
}

/**
 * Deriva si Contabilidad está activa para la empresa — usado por F3
 * (Categorías/Impuestos) y F7 (Caja y Bancos) para condicionar la
 * visibilidad de sus selectores de cuenta contable (§3.8/§3.9/§3.10).
 * `undefined` mientras no se puede determinar todavía (cargando o un
 * error real, no un 404).
 */
export function useAccountingActive(companyId: string): {
  accountingActive: boolean | undefined;
  isLoading: boolean;
} {
  const settings = useAccountingSettings(companyId);
  if (settings.isSuccess) {
    return { accountingActive: true, isLoading: false };
  }
  if (settings.error instanceof ApiError && settings.error.status === 404) {
    return { accountingActive: false, isLoading: false };
  }
  return { accountingActive: undefined, isLoading: settings.isLoading };
}

export function useActivateAccounting(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<AccountingSettings>(`companies/${companyId}/accounting-settings/activate`, companyId, {
        method: 'POST',
      }),
    onSuccess: () => invalidateAccountingSettingsQueries(queryClient, companyId),
  });
}

export function useUpdateAccountingSettings(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAccountingSettingsInput) =>
      apiFetch<AccountingSettings>(`companies/${companyId}/accounting-settings`, companyId, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateAccountingSettingsQueries(queryClient, companyId),
  });
}

export function usePaymentMethodAccountMappings(companyId: string) {
  return useQuery({
    queryKey: queryKeys.accounting.paymentMethodMappings(companyId),
    queryFn: () =>
      apiFetch<PaymentMethodAccountMapping[]>(
        `companies/${companyId}/accounting-settings/payment-method-account-mappings`,
        companyId,
      ),
    enabled: Boolean(companyId),
  });
}

export function useSetPaymentMethodAccountMapping(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetPaymentMethodAccountMappingInput) =>
      apiFetch<PaymentMethodAccountMapping>(
        `companies/${companyId}/accounting-settings/payment-method-account-mappings`,
        companyId,
        { method: 'POST', body: JSON.stringify(input) },
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.paymentMethodMappings(companyId) }),
  });
}
