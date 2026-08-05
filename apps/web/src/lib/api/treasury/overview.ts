import { useQueries } from '@tanstack/react-query';
import { apiFetch } from '../http-client';
import { queryKeys } from '../query-keys';
import { useCustomers } from '../customers';
import { useSuppliers } from '../suppliers';
import type { CurrentAccountView } from '../customers';

/**
 * Vista general de Tesorería (F6 §5.1): saldo total a cobrar (suma de
 * CustomerAccount.currentBalance positivos) y a pagar (suma de
 * SupplierAccount.currentBalance negativos, en valor absoluto) — sin
 * endpoint agregado, componiendo GET .../current-account por cada
 * cliente/proveedor activo vía useQueries (mismo patrón que
 * useCompanyStockOverview, F4).
 */
export function useTreasuryOverview(companyId: string) {
  const customers = useCustomers(companyId, { isActive: true });
  const suppliers = useSuppliers(companyId, { isActive: true });

  const customerAccountQueries = useQueries({
    queries: (customers.data ?? []).map((c) => ({
      queryKey: queryKeys.customers.currentAccount(companyId, c.id),
      queryFn: () =>
        apiFetch<CurrentAccountView>(`companies/${companyId}/customers/${c.id}/current-account`, companyId),
      enabled: Boolean(companyId) && customers.isSuccess,
    })),
  });

  const supplierAccountQueries = useQueries({
    queries: (suppliers.data ?? []).map((s) => ({
      queryKey: queryKeys.suppliers.currentAccount(companyId, s.id),
      queryFn: () =>
        apiFetch<CurrentAccountView>(`companies/${companyId}/suppliers/${s.id}/current-account`, companyId),
      enabled: Boolean(companyId) && suppliers.isSuccess,
    })),
  });

  const isLoading =
    customers.isLoading ||
    suppliers.isLoading ||
    customerAccountQueries.some((q) => q.isLoading) ||
    supplierAccountQueries.some((q) => q.isLoading);

  const totalReceivable = customerAccountQueries.reduce(
    (sum, q) => sum + Math.max(0, Number(q.data?.currentBalance ?? 0)),
    0,
  );
  const totalPayable = supplierAccountQueries.reduce(
    (sum, q) => sum + Math.max(0, -Number(q.data?.currentBalance ?? 0)),
    0,
  );

  return { totalReceivable, totalPayable, isLoading };
}
