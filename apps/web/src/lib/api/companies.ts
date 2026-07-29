import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './http-client';
import { queryKeys } from './query-keys';
import type { SessionCompany } from '../stores/use-session-store';

export async function fetchMyCompanies(): Promise<SessionCompany[]> {
  return apiFetch<SessionCompany[]>('me/companies', '');
}

export function useMyCompanies() {
  return useQuery({
    queryKey: queryKeys.companies.mine(),
    queryFn: fetchMyCompanies,
  });
}

export interface Company {
  id: string;
  tenantId: string;
  legalName: string;
  taxId: string | null;
  taxCondition: string | null;
  activity: string | null;
  address: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  logoUrl: string | null;
  currency: string;
  timezone: string;
  allowNegativeStock: boolean;
  isActive: boolean;
}

export interface UpdateCompanyInput {
  legalName?: string;
  taxId?: string;
  taxCondition?: string;
  activity?: string;
  address?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
  currency?: string;
  timezone?: string;
}

export function useCompany(companyId: string) {
  return useQuery({
    queryKey: queryKeys.companies.detail(companyId),
    queryFn: () => apiFetch<Company>(`companies/${companyId}`, companyId),
    enabled: Boolean(companyId),
  });
}

export function useUpdateCompany(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCompanyInput) =>
      apiFetch<Company>(`companies/${companyId}`, companyId, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (company) => {
      queryClient.setQueryData(queryKeys.companies.detail(companyId), company);
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.mine() });
    },
  });
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
}

export interface BranchInput {
  name: string;
  address?: string;
  phone?: string;
}

export function useBranches(companyId: string) {
  return useQuery({
    queryKey: queryKeys.companies.branches(companyId),
    queryFn: () => apiFetch<Branch[]>(`companies/${companyId}/branches`, companyId),
    enabled: Boolean(companyId),
  });
}

export function useCreateBranch(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BranchInput) =>
      apiFetch<Branch>(`companies/${companyId}/branches`, companyId, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.branches(companyId) });
    },
  });
}

export function useUpdateBranch(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ branchId, input }: { branchId: string; input: Partial<BranchInput> }) =>
      apiFetch<Branch>(`companies/${companyId}/branches/${branchId}`, companyId, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.branches(companyId) });
    },
  });
}

function useBranchStatusMutation(companyId: string, action: 'activate' | 'deactivate') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ branchId, reason }: { branchId: string; reason?: string }) =>
      apiFetch<Branch>(`companies/${companyId}/branches/${branchId}/${action}`, companyId, {
        method: 'POST',
        body: action === 'deactivate' ? JSON.stringify({ reason }) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.branches(companyId) });
    },
  });
}

export function useActivateBranch(companyId: string) {
  return useBranchStatusMutation(companyId, 'activate');
}

export function useDeactivateBranch(companyId: string) {
  return useBranchStatusMutation(companyId, 'deactivate');
}
