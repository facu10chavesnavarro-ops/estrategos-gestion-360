import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../http-client';
import { queryKeys } from '../query-keys';

/**
 * Vista combinada que ya devuelve el backend — definida a mano por el
 * mismo gap de shared-types que el resto de entidades de dominio
 * (F1/F2). `parentId` nulo = raíz del árbol.
 */
export interface Category {
  id: string;
  companyId: string;
  parentId: string | null;
  name: string;
  isActive: boolean;
  salesAccountId: string | null;
  purchasesAccountId: string | null;
}

export interface CreateCategoryInput {
  parentId?: string;
  name: string;
}

export interface UpdateCategoryInput {
  parentId?: string | null;
  name?: string;
  salesAccountId?: string | null;
  purchasesAccountId?: string | null;
}

export function useCategories(companyId: string, isActive?: boolean) {
  return useQuery({
    queryKey: queryKeys.categories.list(companyId, isActive),
    queryFn: () => {
      const qs = isActive === undefined ? '' : `?isActive=${isActive}`;
      return apiFetch<Category[]>(`companies/${companyId}/categories${qs}`, companyId);
    },
    enabled: Boolean(companyId),
  });
}

function invalidateCategoryQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string,
) {
  queryClient.invalidateQueries({ queryKey: ['companies', companyId, 'categories'] });
}

export function useCreateCategory(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) =>
      apiFetch<Category>(`companies/${companyId}/categories`, companyId, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateCategoryQueries(queryClient, companyId),
  });
}

export function useUpdateCategory(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, input }: { categoryId: string; input: UpdateCategoryInput }) =>
      apiFetch<Category>(`companies/${companyId}/categories/${categoryId}`, companyId, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateCategoryQueries(queryClient, companyId),
  });
}

function useCategoryStatusMutation(companyId: string, action: 'activate' | 'deactivate') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) =>
      apiFetch<Category>(`companies/${companyId}/categories/${categoryId}/${action}`, companyId, {
        method: 'POST',
      }),
    onSuccess: () => invalidateCategoryQueries(queryClient, companyId),
  });
}

export function useActivateCategory(companyId: string) {
  return useCategoryStatusMutation(companyId, 'activate');
}

export function useDeactivateCategory(companyId: string) {
  return useCategoryStatusMutation(companyId, 'deactivate');
}
