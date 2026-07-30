'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useActivatePriceList,
  useDeactivatePriceList,
  type PriceList,
} from '@/lib/api/catalog/price-lists';
import { ApiError } from '@/lib/api/http-client';
import { DataTable } from '@/components/shared/data-table';
import { ActiveStatusBadge, StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';

type ConfirmTarget = { priceList: PriceList; action: 'activate' | 'deactivate' };

export function PriceListsTable({
  companyId,
  priceLists,
  canManage,
  onEdit,
  toolbar,
}: {
  companyId: string;
  priceLists: PriceList[];
  canManage: boolean;
  onEdit: (priceList: PriceList) => void;
  toolbar?: React.ReactNode;
}) {
  const activatePriceList = useActivatePriceList(companyId);
  const deactivatePriceList = useDeactivatePriceList(companyId);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);

  async function handleConfirm() {
    if (!confirmTarget) return;
    try {
      if (confirmTarget.action === 'deactivate') {
        await deactivatePriceList.mutateAsync(confirmTarget.priceList.id);
        toast.success('Lista desactivada');
      } else {
        await activatePriceList.mutateAsync(confirmTarget.priceList.id);
        toast.success('Lista activada');
      }
      setConfirmTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo completar la acción');
    }
  }

  const columns: ColumnDef<PriceList, any>[] = [
    {
      accessorKey: 'name',
      header: 'Nombre',
      cell: ({ row }) => (
        <Link
          href={`/${companyId}/catalogo/listas-de-precio/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    { accessorKey: 'currency', header: 'Moneda' },
    {
      id: 'isDefault',
      header: 'Predeterminada',
      cell: ({ row }) => (row.original.isDefault ? <StatusBadge label="Sí" tone="neutral" /> : '—'),
    },
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
            cell: ({ row }: { row: { original: PriceList } }) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setConfirmTarget({
                      priceList: row.original,
                      action: row.original.isActive ? 'deactivate' : 'activate',
                    })
                  }
                >
                  {row.original.isActive ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            ),
          } as ColumnDef<PriceList, any>,
        ]
      : []),
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={priceLists}
        getRowId={(p) => p.id}
        searchPlaceholder="Buscar lista de precios..."
        toolbar={toolbar}
        emptyMessage="Todavía no hay listas de precio."
        renderMobileCard={(priceList) => (
          <Link
            href={`/${companyId}/catalogo/listas-de-precio/${priceList.id}`}
            className="flex items-start justify-between gap-2"
          >
            <div>
              <p className="font-medium">{priceList.name}</p>
              <p className="text-sm text-muted-foreground">{priceList.currency}</p>
            </div>
            <ActiveStatusBadge isActive={priceList.isActive} />
          </Link>
        )}
      />

      {confirmTarget && (
        <ConfirmDialog
          open={Boolean(confirmTarget)}
          onOpenChange={(open) => !open && setConfirmTarget(null)}
          title={confirmTarget.action === 'deactivate' ? 'Desactivar lista' : 'Activar lista'}
          description={`¿Confirmás ${confirmTarget.action === 'deactivate' ? 'desactivar' : 'activar'} "${confirmTarget.priceList.name}"?`}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}
