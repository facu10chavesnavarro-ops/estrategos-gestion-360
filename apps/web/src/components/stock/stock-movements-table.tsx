'use client';

import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useItems, type Item } from '@/lib/api/catalog/items';
import {
  useStockMovements,
  type StockMovement,
  type StockMovementType,
} from '@/lib/api/inventory/stock-movements';
import { ApiError } from '@/lib/api/http-client';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TYPE_LABELS: Record<StockMovementType, string> = {
  PURCHASE_IN: 'Compra (entrada)',
  SALE_OUT: 'Venta (salida)',
  ADJUSTMENT_IN: 'Ajuste (entrada)',
  ADJUSTMENT_OUT: 'Ajuste (salida)',
  TRANSFER_IN: 'Transferencia (entrada)',
  TRANSFER_OUT: 'Transferencia (salida)',
  RETURN_IN: 'Devolución (entrada)',
  RETURN_OUT: 'Devolución (salida)',
};

const OUT_TYPES = new Set<StockMovementType>(['SALE_OUT', 'ADJUSTMENT_OUT', 'TRANSFER_OUT', 'RETURN_OUT']);

/** Historial de movimientos (kardex) de un depósito, con filtros — F4 §5.4. */
export function StockMovementsTable({ companyId, warehouseId }: { companyId: string; warehouseId: string }) {
  const [itemId, setItemId] = useState<string>('all');
  const [type, setType] = useState<StockMovementType | 'all'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const items = useItems(companyId, { isActive: true });
  const movements = useStockMovements(companyId, warehouseId, {
    itemId: itemId === 'all' ? undefined : itemId,
    type: type === 'all' ? undefined : type,
    from: from || undefined,
    to: to || undefined,
  });

  const itemById = new Map<string, Item>((items.data ?? []).map((i) => [i.id, i]));

  if (movements.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (movements.isError) {
    return (
      <p className="text-sm text-destructive">
        {movements.error instanceof ApiError
          ? movements.error.message
          : 'No se pudieron cargar los movimientos.'}
      </p>
    );
  }

  const columns: ColumnDef<StockMovement, any>[] = [
    {
      accessorKey: 'createdAt',
      header: 'Fecha',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString('es-AR'),
    },
    {
      id: 'item',
      header: 'Ítem',
      cell: ({ row }) => itemById.get(row.original.itemId)?.name ?? row.original.itemId,
    },
    {
      id: 'type',
      header: 'Tipo',
      cell: ({ row }) => (
        <StatusBadge
          label={TYPE_LABELS[row.original.type]}
          tone={OUT_TYPES.has(row.original.type) ? 'inactive' : 'active'}
        />
      ),
    },
    { accessorKey: 'quantity', header: 'Cantidad' },
    { accessorKey: 'unitCost', header: 'Costo unitario' },
    {
      accessorKey: 'reason',
      header: 'Motivo',
      cell: ({ row }) => row.original.reason ?? '—',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">Ítem</span>
          <Select value={itemId} onValueChange={(v) => v && setItemId(v)}>
            <SelectTrigger size="sm" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(items.data ?? []).map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">Tipo</span>
          <Select value={type} onValueChange={(v) => v && setType(v as StockMovementType | 'all')}>
            <SelectTrigger size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(Object.keys(TYPE_LABELS) as StockMovementType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">Desde</span>
          <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">Hasta</span>
          <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={movements.data ?? []}
        getRowId={(m) => m.id}
        searchPlaceholder="Buscar movimiento..."
        emptyMessage="Todavía no hay movimientos para este depósito."
        renderMobileCard={(movement) => (
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{itemById.get(movement.itemId)?.name ?? movement.itemId}</p>
              <p className="text-sm text-muted-foreground">
                {TYPE_LABELS[movement.type]} · {movement.quantity}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(movement.createdAt).toLocaleDateString('es-AR')}
            </p>
          </div>
        )}
      />
    </div>
  );
}
