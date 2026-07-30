import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../http-client';
import { queryKeys } from '../query-keys';

export type TaxType = 'VAT' | 'PERCEPTION' | 'WITHHOLDING';

export interface Tax {
  id: string;
  companyId: string;
  name: string;
  type: TaxType;
  rate: string;
  validFrom: string;
  validTo: string | null;
  salesAccountId: string | null;
  purchasesAccountId: string | null;
}

export interface CreateTaxInput {
  name: string;
  type: TaxType;
  rate: string;
  validFrom?: string;
  validTo?: string;
}

export interface UpdateTaxInput {
  name: string;
  salesAccountId?: string | null;
  purchasesAccountId?: string | null;
}

export function useTaxes(companyId: string, onlyCurrentlyValid?: boolean) {
  return useQuery({
    queryKey: queryKeys.taxes.list(companyId, onlyCurrentlyValid),
    queryFn: () => {
      const qs = onlyCurrentlyValid === undefined ? '' : `?onlyCurrentlyValid=${onlyCurrentlyValid}`;
      return apiFetch<Tax[]>(`companies/${companyId}/taxes${qs}`, companyId);
    },
    enabled: Boolean(companyId),
  });
}

function invalidateTaxQueries(queryClient: ReturnType<typeof useQueryClient>, companyId: string) {
  queryClient.invalidateQueries({ queryKey: ['companies', companyId, 'taxes'] });
}

export function useCreateTax(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaxInput) =>
      apiFetch<Tax>(`companies/${companyId}/taxes`, companyId, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateTaxQueries(queryClient, companyId),
  });
}

export function useUpdateTax(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taxId, input }: { taxId: string; input: UpdateTaxInput }) =>
      apiFetch<Tax>(`companies/${companyId}/taxes/${taxId}`, companyId, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateTaxQueries(queryClient, companyId),
  });
}

/** El backend cierra con `validTo = ahora` — no recibe body (ver CloseTaxUseCase). */
export function useCloseTax(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taxId: string) =>
      apiFetch<Tax>(`companies/${companyId}/taxes/${taxId}/close`, companyId, {
        method: 'POST',
      }),
    onSuccess: () => invalidateTaxQueries(queryClient, companyId),
  });
}
