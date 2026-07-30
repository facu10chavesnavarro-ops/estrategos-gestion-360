import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../http-client';
import { queryKeys } from '../query-keys';

export interface PriceList {
  id: string;
  companyId: string;
  name: string;
  currency: string;
  isDefault: boolean;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
}

export interface PriceListItem {
  priceListId: string;
  itemId: string;
  price: string;
}

export interface CreatePriceListInput {
  name: string;
  currency: string;
  isDefault?: boolean;
  validFrom?: string;
  validTo?: string;
}

export interface UpdatePriceListInput {
  name?: string;
  currency?: string;
  isDefault?: boolean;
  validFrom?: string;
  validTo?: string | null;
}

export function usePriceLists(companyId: string, isActive?: boolean) {
  return useQuery({
    queryKey: queryKeys.priceLists.list(companyId, isActive),
    queryFn: () => {
      const qs = isActive === undefined ? '' : `?isActive=${isActive}`;
      return apiFetch<PriceList[]>(`companies/${companyId}/price-lists${qs}`, companyId);
    },
    enabled: Boolean(companyId),
  });
}

function invalidatePriceListQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string,
) {
  queryClient.invalidateQueries({ queryKey: ['companies', companyId, 'price-lists'] });
}

export function useCreatePriceList(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePriceListInput) =>
      apiFetch<PriceList>(`companies/${companyId}/price-lists`, companyId, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidatePriceListQueries(queryClient, companyId),
  });
}

export function useUpdatePriceList(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ priceListId, input }: { priceListId: string; input: UpdatePriceListInput }) =>
      apiFetch<PriceList>(`companies/${companyId}/price-lists/${priceListId}`, companyId, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidatePriceListQueries(queryClient, companyId),
  });
}

function usePriceListStatusMutation(companyId: string, action: 'activate' | 'deactivate') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (priceListId: string) =>
      apiFetch<PriceList>(`companies/${companyId}/price-lists/${priceListId}/${action}`, companyId, {
        method: 'POST',
      }),
    onSuccess: () => invalidatePriceListQueries(queryClient, companyId),
  });
}

export function useActivatePriceList(companyId: string) {
  return usePriceListStatusMutation(companyId, 'activate');
}

export function useDeactivatePriceList(companyId: string) {
  return usePriceListStatusMutation(companyId, 'deactivate');
}

export function usePriceListItems(companyId: string, priceListId: string) {
  return useQuery({
    queryKey: queryKeys.priceLists.items(companyId, priceListId),
    queryFn: () =>
      apiFetch<PriceListItem[]>(`companies/${companyId}/price-lists/${priceListId}/items`, companyId),
    enabled: Boolean(companyId) && Boolean(priceListId),
  });
}

export function useSetPriceListItem(companyId: string, priceListId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, price }: { itemId: string; price: string }) =>
      apiFetch<PriceListItem>(
        `companies/${companyId}/price-lists/${priceListId}/items/${itemId}`,
        companyId,
        { method: 'PUT', body: JSON.stringify({ price }) },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.priceLists.items(companyId, priceListId) });
    },
  });
}

export function useRemovePriceListItem(companyId: string, priceListId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiFetch<void>(`companies/${companyId}/price-lists/${priceListId}/items/${itemId}`, companyId, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.priceLists.items(companyId, priceListId) });
    },
  });
}
