import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../http-client';
import { queryKeys } from '../query-keys';

export type StockMovementType =
  | 'PURCHASE_IN'
  | 'SALE_OUT'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'RETURN_IN'
  | 'RETURN_OUT';

export interface StockMovement {
  id: string;
  companyId: string;
  itemId: string;
  warehouseId: string;
  type: StockMovementType;
  quantity: string;
  unitCost: string;
  reason: string | null;
  transferGroupId: string | null;
  voucherId: string | null;
  userId: string;
  createdAt: string;
}

export interface StockMovementFilters {
  itemId?: string;
  type?: StockMovementType;
  from?: string;
  to?: string;
}

function movementsQueryString(filters: StockMovementFilters): string {
  const params = new URLSearchParams();
  if (filters.itemId) params.set('itemId', filters.itemId);
  if (filters.type) params.set('type', filters.type);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useStockMovements(companyId: string, warehouseId: string, filters: StockMovementFilters = {}) {
  return useQuery({
    queryKey: queryKeys.inventory.stockMovements(companyId, warehouseId, filters),
    queryFn: () =>
      apiFetch<StockMovement[]>(
        `companies/${companyId}/warehouses/${warehouseId}/stock-movements${movementsQueryString(filters)}`,
        companyId,
      ),
    enabled: Boolean(companyId) && Boolean(warehouseId),
  });
}

export interface StockAdjustmentInput {
  itemId: string;
  direction: 'IN' | 'OUT';
  quantity: string;
  unitCost?: string;
  reason?: string;
}

function invalidateStockQueries(queryClient: ReturnType<typeof useQueryClient>, companyId: string, warehouseId: string) {
  queryClient.invalidateQueries({
    queryKey: ['companies', companyId, 'warehouses', warehouseId],
  });
}

export function useCreateStockAdjustment(companyId: string, warehouseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StockAdjustmentInput) =>
      apiFetch<StockMovement>(
        `companies/${companyId}/warehouses/${warehouseId}/stock-movements/adjustment`,
        companyId,
        { method: 'POST', body: JSON.stringify(input) },
      ),
    onSuccess: () => invalidateStockQueries(queryClient, companyId, warehouseId),
  });
}

export interface StockTransferInput {
  fromWarehouseId: string;
  toWarehouseId: string;
  itemId: string;
  quantity: string;
  reason: string;
}

export interface StockTransferResult {
  outMovement: StockMovement;
  inMovement: StockMovement;
}

export function useCreateStockTransfer(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StockTransferInput) =>
      apiFetch<StockTransferResult>(`companies/${companyId}/stock-transfers`, companyId, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_result, input) => {
      invalidateStockQueries(queryClient, companyId, input.fromWarehouseId);
      invalidateStockQueries(queryClient, companyId, input.toWarehouseId);
    },
  });
}
