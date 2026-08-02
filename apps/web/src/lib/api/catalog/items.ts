import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../http-client';
import { queryKeys } from '../query-keys';
import type { ImportMode, ImportSummary } from '../import';
import { useAllWarehouses } from '../inventory/warehouses';
import type { Stock } from '../inventory/stock';

export type ItemType = 'PRODUCT' | 'SERVICE';

/**
 * Vista combinada que ya devuelve el backend — definida a mano por el
 * mismo gap de shared-types que el resto de entidades de dominio
 * (F1/F2). Incluye la extensión de barcode/costPrice/longDescription
 * (backend v1.2.0, ver CHANGELOG.md).
 */
export interface Item {
  id: string;
  companyId: string;
  type: ItemType;
  sku: string;
  name: string;
  description: string | null;
  longDescription: string | null;
  barcode: string | null;
  categoryId: string | null;
  unitOfMeasure: string;
  tracksStock: boolean;
  minimumStock: string | null;
  costPrice: string | null;
  isActive: boolean;
  taxIds: string[];
}

export interface ItemInput {
  type: ItemType;
  sku: string;
  name: string;
  description?: string;
  longDescription?: string;
  barcode?: string;
  categoryId?: string;
  unitOfMeasure: string;
  tracksStock?: boolean;
  minimumStock?: string;
  costPrice?: string;
  taxIds?: string[];
}

export interface ItemFilters {
  type?: ItemType;
  categoryId?: string;
  isActive?: boolean;
  search?: string;
}

function itemsQueryString(filters: ItemFilters): string {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
  if (filters.search) params.set('search', filters.search);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useItems(companyId: string, filters: ItemFilters) {
  return useQuery({
    queryKey: queryKeys.items.list(companyId, filters),
    queryFn: () => apiFetch<Item[]>(`companies/${companyId}/items${itemsQueryString(filters)}`, companyId),
    enabled: Boolean(companyId),
  });
}

export function useItem(companyId: string, itemId: string) {
  return useQuery({
    queryKey: queryKeys.items.detail(companyId, itemId),
    queryFn: () => apiFetch<Item>(`companies/${companyId}/items/${itemId}`, companyId),
    enabled: Boolean(companyId) && Boolean(itemId),
  });
}

function invalidateItemQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string,
  itemId?: string,
) {
  queryClient.invalidateQueries({ queryKey: ['companies', companyId, 'items'] });
  if (itemId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.items.detail(companyId, itemId) });
  }
}

export function useCreateItem(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ItemInput) =>
      apiFetch<Item>(`companies/${companyId}/items`, companyId, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateItemQueries(queryClient, companyId),
  });
}

export function useUpdateItem(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, input }: { itemId: string; input: Partial<ItemInput> }) =>
      apiFetch<Item>(`companies/${companyId}/items/${itemId}`, companyId, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (item) => invalidateItemQueries(queryClient, companyId, item.id),
  });
}

function useItemStatusMutation(companyId: string, action: 'activate' | 'deactivate') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiFetch<Item>(`companies/${companyId}/items/${itemId}/${action}`, companyId, {
        method: 'POST',
      }),
    onSuccess: (item) => invalidateItemQueries(queryClient, companyId, item.id),
  });
}

export function useActivateItem(companyId: string) {
  return useItemStatusMutation(companyId, 'activate');
}

export function useDeactivateItem(companyId: string) {
  return useItemStatusMutation(companyId, 'deactivate');
}

export function useImportItems(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ csvContent, mode }: { csvContent: string; mode: ImportMode }) =>
      apiFetch<ImportSummary>(`companies/${companyId}/items/import`, companyId, {
        method: 'POST',
        body: JSON.stringify({ csvContent, mode }),
      }),
    onSuccess: () => invalidateItemQueries(queryClient, companyId),
  });
}

/**
 * `GET .../items/export` devuelve `text/csv` crudo, no JSON — no encaja
 * en `apiFetch<T>` (piensa en JSON). Acción imperativa fuera de TanStack
 * Query (mismo criterio que login/logout en lib/api/auth.ts): dispara un
 * fetch directo contra el proxy BFF y fuerza la descarga del navegador.
 */
export async function exportItemsCsv(companyId: string, filters: ItemFilters): Promise<void> {
  const res = await fetch(`/api/backend/companies/${companyId}/items/export${itemsQueryString(filters)}`, {
    headers: { 'X-Company-Id': companyId },
  });
  if (!res.ok) {
    throw new Error('No se pudo exportar el catálogo.');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'items.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// --- Stock actual del ítem, compuesto contra endpoints ya existentes de
// inventory (ver docs/frontend/06-sprint-f3-catalogo.md §3.5). Sprint F4
// extrajo la composición sucursales→depósitos a useAllWarehouses
// (lib/api/inventory/warehouses.ts) — esta función ahora solo agrega la
// etapa de stock por ítem sobre esa base compartida, sin duplicarla. ---

export interface ItemStockRow {
  branchId: string;
  branchName: string;
  warehouseId: string;
  warehouseName: string;
  quantity: string;
  averageCost: string;
}

export function useItemStockAcrossWarehouses(companyId: string, itemId: string) {
  const { warehouses, isLoading: warehousesLoading, isSuccess: warehousesLoaded } =
    useAllWarehouses(companyId);
  const activeWarehouses = warehouses.filter((w) => w.isActive);

  const stockQueries = useQueries({
    queries: activeWarehouses.map((warehouse) => ({
      queryKey: queryKeys.inventory.stock(companyId, warehouse.id, itemId),
      queryFn: () =>
        apiFetch<Stock[]>(
          `companies/${companyId}/warehouses/${warehouse.id}/stock?itemId=${itemId}`,
          companyId,
        ),
      enabled: Boolean(companyId) && Boolean(itemId) && warehousesLoaded,
    })),
  });

  const isLoading =
    warehousesLoading || (stockQueries.length > 0 && stockQueries.some((q) => q.isLoading));

  const rows: ItemStockRow[] = activeWarehouses.map((warehouse, i) => {
    const stockForItem = stockQueries[i]?.data?.[0];
    return {
      branchId: warehouse.branchId,
      branchName: warehouse.branchName,
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      quantity: stockForItem?.quantity ?? '0',
      averageCost: stockForItem?.averageCost ?? '0',
    };
  });

  return { rows, isLoading };
}
