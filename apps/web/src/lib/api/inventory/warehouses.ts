import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../http-client';
import { queryKeys } from '../query-keys';
import { useBranches } from '../companies';

export interface Warehouse {
  id: string;
  companyId: string;
  branchId: string;
  name: string;
  isActive: boolean;
}

export interface WarehouseWithBranch extends Warehouse {
  branchName: string;
}

export interface WarehouseInput {
  name: string;
}

export function useWarehouses(companyId: string, branchId: string) {
  return useQuery({
    queryKey: queryKeys.inventory.warehousesByBranch(companyId, branchId),
    queryFn: () =>
      apiFetch<Warehouse[]>(`companies/${companyId}/branches/${branchId}/warehouses`, companyId),
    enabled: Boolean(companyId) && Boolean(branchId),
  });
}

/**
 * Todos los depósitos de la empresa (todas las sucursales activas), en dos
 * etapas paralelas — mismo patrón que useItemStockAcrossWarehouses (F3):
 * sucursales activas → depósitos de cada una, vía useQueries. Única fuente
 * de esta composición: F3 la reutiliza para el panel de stock del ítem, F4
 * la reutiliza para Vista general, Depósitos y Transferencias.
 */
export function useAllWarehouses(companyId: string) {
  const branches = useBranches(companyId);
  const activeBranches = (branches.data ?? []).filter((b) => b.isActive);

  const warehouseQueries = useQueries({
    queries: activeBranches.map((branch) => ({
      queryKey: queryKeys.inventory.warehousesByBranch(companyId, branch.id),
      queryFn: () =>
        apiFetch<Warehouse[]>(`companies/${companyId}/branches/${branch.id}/warehouses`, companyId),
      enabled: Boolean(companyId) && branches.isSuccess,
    })),
  });

  const isLoading = branches.isLoading || (warehouseQueries.length > 0 && warehouseQueries.some((q) => q.isLoading));
  const isSuccess = warehouseQueries.length === 0 || warehouseQueries.every((q) => q.isSuccess);

  const warehouses: WarehouseWithBranch[] = warehouseQueries.flatMap((q, i) =>
    (q.data ?? []).map((w) => ({ ...w, branchName: activeBranches[i].name })),
  );

  return { warehouses, isLoading, isSuccess };
}

/**
 * Invalida por el prefijo `['companies', companyId, 'branches']` (sin
 * `branchId`) — TanStack Query matchea por prefijo, así que esto refresca
 * la lista de depósitos de CUALQUIER sucursal de un solo saque. Necesario
 * porque "Depósitos" (F4 §5.3) lista depósitos de todas las sucursales
 * juntos: una mutación sobre un depósito no sabe (ni le importa) a cuál
 * sucursal pertenecía la lista que el usuario tenía abierta.
 */
function invalidateWarehouseQueries(queryClient: ReturnType<typeof useQueryClient>, companyId: string) {
  queryClient.invalidateQueries({ queryKey: ['companies', companyId, 'branches'] });
}

export function useCreateWarehouse(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ branchId, input }: { branchId: string; input: WarehouseInput }) =>
      apiFetch<Warehouse>(`companies/${companyId}/branches/${branchId}/warehouses`, companyId, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateWarehouseQueries(queryClient, companyId),
  });
}

/**
 * PATCH y activar/desactivar viven, en el backend, bajo el mismo controller
 * que el alta (`companies/:companyId/branches/:branchId/warehouses/...`) —
 * `branchId` no se usa dentro del handler, pero sigue siendo parte de la
 * URL. Por eso estas mutaciones piden `branchId` aunque no lo modifiquen:
 * viene del `WarehouseWithBranch` que ya tiene el llamador (fila de la
 * tabla, o el propio depósito que se está editando).
 */
export function useUpdateWarehouse(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      branchId,
      warehouseId,
      input,
    }: {
      branchId: string;
      warehouseId: string;
      input: WarehouseInput;
    }) =>
      apiFetch<Warehouse>(
        `companies/${companyId}/branches/${branchId}/warehouses/${warehouseId}`,
        companyId,
        { method: 'PATCH', body: JSON.stringify(input) },
      ),
    onSuccess: () => invalidateWarehouseQueries(queryClient, companyId),
  });
}

function useWarehouseStatusMutation(companyId: string, action: 'activate' | 'deactivate') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ branchId, warehouseId }: { branchId: string; warehouseId: string }) =>
      apiFetch<Warehouse>(
        `companies/${companyId}/branches/${branchId}/warehouses/${warehouseId}/${action}`,
        companyId,
        { method: 'POST' },
      ),
    onSuccess: () => invalidateWarehouseQueries(queryClient, companyId),
  });
}

export function useActivateWarehouse(companyId: string) {
  return useWarehouseStatusMutation(companyId, 'activate');
}

export function useDeactivateWarehouse(companyId: string) {
  return useWarehouseStatusMutation(companyId, 'deactivate');
}
