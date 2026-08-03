import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../http-client';
import { queryKeys } from '../query-keys';
import { useBranches } from '../companies';

export interface PointOfSale {
  id: string;
  companyId: string;
  branchId: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface PointOfSaleWithBranch extends PointOfSale {
  branchName: string;
}

export interface CreatePointOfSaleInput {
  code: string;
  name: string;
}

export interface UpdatePointOfSaleInput {
  name: string;
}

export function usePointsOfSale(companyId: string, branchId: string) {
  return useQuery({
    queryKey: queryKeys.vouchers.pointsOfSaleByBranch(companyId, branchId),
    queryFn: () =>
      apiFetch<PointOfSale[]>(`companies/${companyId}/branches/${branchId}/points-of-sale`, companyId),
    enabled: Boolean(companyId) && Boolean(branchId),
  });
}

/**
 * Todos los puntos de venta de la empresa (todas las sucursales activas),
 * mismo patrón de composición en dos etapas que useAllWarehouses (F4):
 * sucursales activas → puntos de venta de cada una, vía useQueries.
 */
export function useAllPointsOfSale(companyId: string) {
  const branches = useBranches(companyId);
  const activeBranches = (branches.data ?? []).filter((b) => b.isActive);

  const posQueries = useQueries({
    queries: activeBranches.map((branch) => ({
      queryKey: queryKeys.vouchers.pointsOfSaleByBranch(companyId, branch.id),
      queryFn: () =>
        apiFetch<PointOfSale[]>(
          `companies/${companyId}/branches/${branch.id}/points-of-sale`,
          companyId,
        ),
      enabled: Boolean(companyId) && branches.isSuccess,
    })),
  });

  const isLoading = branches.isLoading || (posQueries.length > 0 && posQueries.some((q) => q.isLoading));
  const isSuccess = posQueries.length === 0 || posQueries.every((q) => q.isSuccess);

  const pointsOfSale: PointOfSaleWithBranch[] = posQueries.flatMap((q, i) =>
    (q.data ?? []).map((pos) => ({ ...pos, branchName: activeBranches[i].name })),
  );

  return { pointsOfSale, isLoading, isSuccess };
}

function invalidatePointOfSaleQueries(queryClient: ReturnType<typeof useQueryClient>, companyId: string) {
  queryClient.invalidateQueries({ queryKey: ['companies', companyId, 'branches'] });
}

export function useCreatePointOfSale(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ branchId, input }: { branchId: string; input: CreatePointOfSaleInput }) =>
      apiFetch<PointOfSale>(`companies/${companyId}/branches/${branchId}/points-of-sale`, companyId, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidatePointOfSaleQueries(queryClient, companyId),
  });
}

/**
 * PATCH y activar/desactivar cuelgan, en el backend, del mismo controller
 * que el alta (`companies/:companyId/branches/:branchId/points-of-sale/...`)
 * — igual que Depósitos en F4, `branchId` va en la URL aunque el handler no
 * lo use en estos tres casos.
 */
export function useUpdatePointOfSale(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      branchId,
      pointOfSaleId,
      input,
    }: {
      branchId: string;
      pointOfSaleId: string;
      input: UpdatePointOfSaleInput;
    }) =>
      apiFetch<PointOfSale>(
        `companies/${companyId}/branches/${branchId}/points-of-sale/${pointOfSaleId}`,
        companyId,
        { method: 'PATCH', body: JSON.stringify(input) },
      ),
    onSuccess: () => invalidatePointOfSaleQueries(queryClient, companyId),
  });
}

function usePointOfSaleStatusMutation(companyId: string, action: 'activate' | 'deactivate') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ branchId, pointOfSaleId }: { branchId: string; pointOfSaleId: string }) =>
      apiFetch<PointOfSale>(
        `companies/${companyId}/branches/${branchId}/points-of-sale/${pointOfSaleId}/${action}`,
        companyId,
        { method: 'POST' },
      ),
    onSuccess: () => invalidatePointOfSaleQueries(queryClient, companyId),
  });
}

export function useActivatePointOfSale(companyId: string) {
  return usePointOfSaleStatusMutation(companyId, 'activate');
}

export function useDeactivatePointOfSale(companyId: string) {
  return usePointOfSaleStatusMutation(companyId, 'deactivate');
}
