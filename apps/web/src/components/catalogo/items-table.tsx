'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useActivateItem,
  useDeactivateItem,
  type Item,
  type ItemType,
} from '@/lib/api/catalog/items';
import { ApiError } from '@/lib/api/http-client';
import { DataTable } from '@/components/shared/data-table';
import { ActiveStatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';

type ConfirmTarget = { item: Item; action: 'activate' | 'deactivate' };

export function ItemsTable({
  companyId,
  basePath,
  items,
  canManage,
  onEdit,
  toolbar,
}: {
  companyId: string;
  /** "productos" | "servicios" — a qué ruta de detalle navega cada fila. */
  basePath: string;
  items: Item[];
  canManage: boolean;
  onEdit: (item: Item) => void;
  toolbar?: React.ReactNode;
}) {
  const activateItem = useActivateItem(companyId);
  const deactivateItem = useDeactivateItem(companyId);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);

  async function handleConfirm() {
    if (!confirmTarget) return;
    try {
      if (confirmTarget.action === 'deactivate') {
        await deactivateItem.mutateAsync(confirmTarget.item.id);
        toast.success('Ítem desactivado');
      } else {
        await activateItem.mutateAsync(confirmTarget.item.id);
        toast.success('Ítem activado');
      }
      setConfirmTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo completar la acción');
    }
  }

  const columns: ColumnDef<Item, any>[] = [
    {
      accessorKey: 'name',
      header: 'Nombre',
      cell: ({ row }) => (
        <Link href={`/${companyId}/catalogo/${basePath}/${row.original.id}`} className="font-medium hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    { accessorKey: 'sku', header: 'SKU' },
    { accessorKey: 'barcode', header: 'Código de barras', cell: ({ row }) => row.original.barcode ?? '—' },
    { accessorKey: 'unitOfMeasure', header: 'Unidad' },
    { accessorKey: 'costPrice', header: 'Costo', cell: ({ row }) => row.original.costPrice ?? '—' },
    {
      id: 'status',
      header: 'Estado',
      cell: ({ row }) => <ActiveStatusBadge isActive={row.original.isActive} />,
    },
    ...(canManage
      ? [
          {
            id: 'actions',
            header: '',
            cell: ({ row }: { row: { original: Item } }) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setConfirmTarget({
                      item: row.original,
                      action: row.original.isActive ? 'deactivate' : 'activate',
                    })
                  }
                >
                  {row.original.isActive ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            ),
          } as ColumnDef<Item, any>,
        ]
      : []),
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={items}
        getRowId={(i) => i.id}
        searchPlaceholder="Buscar por nombre o SKU..."
        toolbar={toolbar}
        emptyMessage="Todavía no hay ítems."
        renderMobileCard={(item) => (
          <Link
            href={`/${companyId}/catalogo/${basePath}/${item.id}`}
            className="flex items-start justify-between gap-2"
          >
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">{item.sku}</p>
            </div>
            <ActiveStatusBadge isActive={item.isActive} />
          </Link>
        )}
      />

      {confirmTarget && (
        <ConfirmDialog
          open={Boolean(confirmTarget)}
          onOpenChange={(open) => !open && setConfirmTarget(null)}
          title={confirmTarget.action === 'deactivate' ? 'Desactivar ítem' : 'Activar ítem'}
          description={`¿Confirmás ${confirmTarget.action === 'deactivate' ? 'desactivar' : 'activar'} "${confirmTarget.item.name}"?`}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}

export type { ItemType };
