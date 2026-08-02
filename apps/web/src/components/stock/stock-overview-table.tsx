'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import type { StockOverviewRow } from '@/lib/api/inventory/stock';
import type { WarehouseWithBranch } from '@/lib/api/inventory/warehouses';
import { DataTable } from '@/components/shared/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** Vista general de stock (F4 §5.1): todo depósito × todo ítem con stock. */
export function StockOverviewTable({
  companyId,
  rows,
  warehouses,
}: {
  companyId: string;
  rows: StockOverviewRow[];
  warehouses: WarehouseWithBranch[];
}) {
  const [warehouseId, setWarehouseId] = useState('all');

  const filtered = useMemo(
    () => (warehouseId === 'all' ? rows : rows.filter((r) => r.warehouseId === warehouseId)),
    [rows, warehouseId],
  );

  const columns: ColumnDef<StockOverviewRow, any>[] = [
    { accessorKey: 'branchName', header: 'Sucursal' },
    {
      id: 'warehouseName',
      header: 'Depósito',
      cell: ({ row }) => (
        <Link
          href={`/${companyId}/stock/depositos/${row.original.warehouseId}`}
          className="hover:underline"
        >
          {row.original.warehouseName}
        </Link>
      ),
    },
    { accessorKey: 'itemName', header: 'Ítem' },
    { accessorKey: 'itemSku', header: 'SKU' },
    { accessorKey: 'quantity', header: 'Cantidad' },
    { accessorKey: 'averageCost', header: 'Costo promedio' },
  ];

  return (
    <DataTable
      columns={columns}
      data={filtered}
      getRowId={(r) => `${r.warehouseId}-${r.itemId}`}
      searchPlaceholder="Buscar por ítem o SKU..."
      emptyMessage="Todavía no hay stock cargado."
      toolbar={
        <Select value={warehouseId} onValueChange={(v) => v && setWarehouseId(v)}>
          <SelectTrigger size="sm" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los depósitos</SelectItem>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name} ({w.branchName})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      renderMobileCard={(row) => (
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium">{row.itemName}</p>
            <p className="text-sm text-muted-foreground">
              {row.warehouseName} · {row.branchName}
            </p>
          </div>
          <p className="font-mono text-sm">{row.quantity}</p>
        </div>
      )}
    />
  );
}
