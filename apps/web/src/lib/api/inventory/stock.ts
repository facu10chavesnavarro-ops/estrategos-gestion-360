import { useQueries, useQuery } from '@tanstack/react-query';
import { apiFetch } from '../http-client';
import { queryKeys } from '../query-keys';
import { useItems, type Item } from '../catalog/items';
import { useAllWarehouses, type WarehouseWithBranch } from './warehouses';

export interface Stock {
  companyId: string;
  itemId: string;
  warehouseId: string;
  quantity: string;
  averageCost: string;
}

/** Stock de un depósito — todos los ítems (`itemId` omitido) o uno solo. */
export function useStock(companyId: string, warehouseId: string, itemId?: string) {
  return useQuery({
    queryKey: queryKeys.inventory.stock(companyId, warehouseId, itemId),
    queryFn: () => {
      const qs = itemId ? `?itemId=${itemId}` : '';
      return apiFetch<Stock[]>(`companies/${companyId}/warehouses/${warehouseId}/stock${qs}`, companyId);
    },
    enabled: Boolean(companyId) && Boolean(warehouseId),
  });
}

export interface StockOverviewRow {
  branchId: string;
  branchName: string;
  warehouseId: string;
  warehouseName: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  quantity: string;
  averageCost: string;
}

/**
 * Vista general de stock (F4 §5.1): todo depósito × todo ítem con stock
 * cargado. Sin endpoint agregado — compone `useAllWarehouses` (F4) con una
 * consulta de stock (sin filtro de ítem) por cada depósito activo, vía
 * `useQueries`, y cruza `itemId` contra `useItems` para mostrar nombre/SKU
 * (mismo criterio de "sin endpoint nuevo" que useItemStockAcrossWarehouses,
 * F3 §3.5).
 */
export function useCompanyStockOverview(companyId: string) {
  const { warehouses, isLoading: warehousesLoading, isSuccess: warehousesLoaded } =
    useAllWarehouses(companyId);
  const activeWarehouses = warehouses.filter((w) => w.isActive);
  const items = useItems(companyId, { isActive: true });

  const stockQueries = useQueries({
    queries: activeWarehouses.map((warehouse) => ({
      queryKey: queryKeys.inventory.stock(companyId, warehouse.id, undefined),
      queryFn: () => apiFetch<Stock[]>(`companies/${companyId}/warehouses/${warehouse.id}/stock`, companyId),
      enabled: Boolean(companyId) && warehousesLoaded,
    })),
  });

  const isLoading =
    warehousesLoading || items.isLoading || (stockQueries.length > 0 && stockQueries.some((q) => q.isLoading));

  const itemById = new Map<string, Item>((items.data ?? []).map((i) => [i.id, i]));

  const rows: StockOverviewRow[] = activeWarehouses.flatMap((warehouse: WarehouseWithBranch, i) => {
    const stockRows = stockQueries[i]?.data ?? [];
    return stockRows
      .filter((s) => Number(s.quantity) !== 0)
      .map((s) => {
        const item = itemById.get(s.itemId);
        return {
          branchId: warehouse.branchId,
          branchName: warehouse.branchName,
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          itemId: s.itemId,
          itemName: item?.name ?? s.itemId,
          itemSku: item?.sku ?? '—',
          quantity: s.quantity,
          averageCost: s.averageCost,
        };
      });
  });

  return { rows, isLoading };
}
