import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './http-client';
import { queryKeys } from './query-keys';
import type { ImportMode, ImportSummary } from './import';
import type { CurrentAccountView } from './customers';

/**
 * `Supplier` es la vista combinada que ya devuelve el backend (`Party`
 * compartido + lo específico del rol) — ver
 * docs/sprint-2/01-clientes-proveedores.md §0.4. Definido a mano por el
 * mismo gap de shared-types que Company/Member en F1.
 */
export interface Supplier {
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
  bankName: string | null;
  bankAccountHolder: string | null;
  bankCbu: string | null;
  isActive: boolean;
}

export interface SupplierInput {
  legalName: string;
  taxId?: string;
  taxCondition?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactName?: string;
  notes?: string;
  paymentTermDays?: number;
  bankName?: string;
  bankAccountHolder?: string;
  bankCbu?: string;
}

export interface SupplierFilters {
  search?: string;
  isActive?: boolean;
}

function suppliersQueryString(filters: SupplierFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useSuppliers(companyId: string, filters: SupplierFilters) {
  return useQuery({
    queryKey: queryKeys.suppliers.list(companyId, filters),
    queryFn: () =>
      apiFetch<Supplier[]>(`companies/${companyId}/suppliers${suppliersQueryString(filters)}`, companyId),
    enabled: Boolean(companyId),
  });
}

export function useSupplier(companyId: string, supplierId: string) {
  return useQuery({
    queryKey: queryKeys.suppliers.detail(companyId, supplierId),
    queryFn: () => apiFetch<Supplier>(`companies/${companyId}/suppliers/${supplierId}`, companyId),
    enabled: Boolean(companyId) && Boolean(supplierId),
  });
}

function invalidateSupplierQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string,
  supplierId?: string,
) {
  queryClient.invalidateQueries({ queryKey: ['companies', companyId, 'suppliers'] });
  if (supplierId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.suppliers.detail(companyId, supplierId),
    });
  }
}

export function useCreateSupplier(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SupplierInput) =>
      apiFetch<Supplier>(`companies/${companyId}/suppliers`, companyId, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateSupplierQueries(queryClient, companyId),
  });
}

export function useUpdateSupplier(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ supplierId, input }: { supplierId: string; input: Partial<SupplierInput> }) =>
      apiFetch<Supplier>(`companies/${companyId}/suppliers/${supplierId}`, companyId, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (supplier) => invalidateSupplierQueries(queryClient, companyId, supplier.id),
  });
}

function useSupplierStatusMutation(companyId: string, action: 'activate' | 'deactivate') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (supplierId: string) =>
      apiFetch<Supplier>(`companies/${companyId}/suppliers/${supplierId}/${action}`, companyId, {
        method: 'POST',
      }),
    onSuccess: (supplier) => invalidateSupplierQueries(queryClient, companyId, supplier.id),
  });
}

export function useActivateSupplier(companyId: string) {
  return useSupplierStatusMutation(companyId, 'activate');
}

export function useDeactivateSupplier(companyId: string) {
  return useSupplierStatusMutation(companyId, 'deactivate');
}

export function useImportSuppliers(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ csvContent, mode }: { csvContent: string; mode: ImportMode }) =>
      apiFetch<ImportSummary>(`companies/${companyId}/suppliers/import`, companyId, {
        method: 'POST',
        body: JSON.stringify({ csvContent, mode }),
      }),
    onSuccess: () => invalidateSupplierQueries(queryClient, companyId),
  });
}

export function useSupplierCurrentAccount(companyId: string, supplierId: string) {
  return useQuery({
    queryKey: queryKeys.suppliers.currentAccount(companyId, supplierId),
    queryFn: () =>
      apiFetch<CurrentAccountView>(
        `companies/${companyId}/suppliers/${supplierId}/current-account`,
        companyId,
      ),
    enabled: Boolean(companyId) && Boolean(supplierId),
  });
}
