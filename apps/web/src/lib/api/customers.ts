import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './http-client';
import { queryKeys } from './query-keys';
import type { ImportMode, ImportSummary } from './import';

/**
 * `Customer` es la vista combinada que ya devuelve el backend (`Party`
 * compartido + lo específico del rol) — ver
 * docs/sprint-2/01-clientes-proveedores.md §0.4. Definido a mano por el
 * mismo gap de shared-types que Company/Member en F1 (entidades de
 * dominio llegan como `Record<string, never>` en el OpenAPI generado).
 */
export interface Customer {
  id: string;
  partyId: string;
  companyId: string;
  legalName: string;
  taxId: string | null;
  taxCondition: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  contactName: string | null;
  notes: string | null;
  paymentTermDays: number | null;
  creditLimit: string | null;
  isActive: boolean;
}

export interface CustomerInput {
  legalName: string;
  taxId?: string;
  taxCondition?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactName?: string;
  notes?: string;
  paymentTermDays?: number;
  creditLimit?: string;
}

export interface CustomerFilters {
  search?: string;
  isActive?: boolean;
}

function customersQueryString(filters: CustomerFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useCustomers(companyId: string, filters: CustomerFilters) {
  return useQuery({
    queryKey: queryKeys.customers.list(companyId, filters),
    queryFn: () =>
      apiFetch<Customer[]>(`companies/${companyId}/customers${customersQueryString(filters)}`, companyId),
    enabled: Boolean(companyId),
  });
}

export function useCustomer(companyId: string, customerId: string) {
  return useQuery({
    queryKey: queryKeys.customers.detail(companyId, customerId),
    queryFn: () => apiFetch<Customer>(`companies/${companyId}/customers/${customerId}`, companyId),
    enabled: Boolean(companyId) && Boolean(customerId),
  });
}

function invalidateCustomerQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string,
  customerId?: string,
) {
  queryClient.invalidateQueries({ queryKey: ['companies', companyId, 'customers'] });
  if (customerId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.customers.detail(companyId, customerId),
    });
  }
}

export function useCreateCustomer(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerInput) =>
      apiFetch<Customer>(`companies/${companyId}/customers`, companyId, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateCustomerQueries(queryClient, companyId),
  });
}

export function useUpdateCustomer(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, input }: { customerId: string; input: Partial<CustomerInput> }) =>
      apiFetch<Customer>(`companies/${companyId}/customers/${customerId}`, companyId, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (customer) => invalidateCustomerQueries(queryClient, companyId, customer.id),
  });
}

function useCustomerStatusMutation(companyId: string, action: 'activate' | 'deactivate') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) =>
      apiFetch<Customer>(`companies/${companyId}/customers/${customerId}/${action}`, companyId, {
        method: 'POST',
      }),
    onSuccess: (customer) => invalidateCustomerQueries(queryClient, companyId, customer.id),
  });
}

export function useActivateCustomer(companyId: string) {
  return useCustomerStatusMutation(companyId, 'activate');
}

export function useDeactivateCustomer(companyId: string) {
  return useCustomerStatusMutation(companyId, 'deactivate');
}

export function useImportCustomers(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ csvContent, mode }: { csvContent: string; mode: ImportMode }) =>
      apiFetch<ImportSummary>(`companies/${companyId}/customers/import`, companyId, {
        method: 'POST',
        body: JSON.stringify({ csvContent, mode }),
      }),
    onSuccess: () => invalidateCustomerQueries(queryClient, companyId),
  });
}

export interface CurrentAccountMovement {
  id: string;
  type: 'DEBIT' | 'CREDIT';
  amount: string;
  balanceAfter: string;
  voucherId: string | null;
  paymentId: string | null;
  createdAt: string;
}

export interface CurrentAccountView {
  currentBalance: string;
  movements: CurrentAccountMovement[];
}

export function useCustomerCurrentAccount(companyId: string, customerId: string) {
  return useQuery({
    queryKey: queryKeys.customers.currentAccount(companyId, customerId),
    queryFn: () =>
      apiFetch<CurrentAccountView>(
        `companies/${companyId}/customers/${customerId}/current-account`,
        companyId,
      ),
    enabled: Boolean(companyId) && Boolean(customerId),
  });
}
