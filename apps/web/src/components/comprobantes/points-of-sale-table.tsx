'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  type PointOfSaleWithBranch,
  useActivatePointOfSale,
  useDeactivatePointOfSale,
} from '@/lib/api/vouchers/point-of-sale';
import { ApiError } from '@/lib/api/http-client';
import { DataTable } from '@/components/shared/data-table';
import { ActiveStatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';

type ConfirmTarget = { pointOfSale: PointOfSaleWithBranch; action: 'activate' | 'deactivate' };

export function PointsOfSaleTable({
  companyId,
  pointsOfSale,
  canManage,
  onEdit,
  toolbar,
}: {
  companyId: string;
  pointsOfSale: PointOfSaleWithBranch[];
  canManage: boolean;
  onEdit: (pointOfSale: PointOfSaleWithBranch) => void;
  toolbar?: React.ReactNode;
}) {
  const activatePointOfSale = useActivatePointOfSale(companyId);
  const deactivatePointOfSale = useDeactivatePointOfSale(companyId);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);

  async function handleConfirm() {
    if (!confirmTarget) return;
    try {
      const { id: pointOfSaleId, branchId } = confirmTarget.pointOfSale;
      if (confirmTarget.action === 'deactivate') {
        await deactivatePointOfSale.mutateAsync({ branchId, pointOfSaleId });
        toast.success('Punto de venta desactivado');
      } else {
        await activatePointOfSale.mutateAsync({ branchId, pointOfSaleId });
        toast.success('Punto de venta activado');
      }
      setConfirmTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo completar la acción');
    }
  }

  const columns: ColumnDef<PointOfSaleWithBranch, any>[] = [
    { accessorKey: 'code', header: 'Código' },
    { accessorKey: 'name', header: 'Nombre' },
    { accessorKey: 'branchName', header: 'Sucursal' },
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
            cell: ({ row }: { row: { original: PointOfSaleWithBranch } }) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setConfirmTarget({
                      pointOfSale: row.original,
                      action: row.original.isActive ? 'deactivate' : 'activate',
                    })
                  }
                >
                  {row.original.isActive ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            ),
          } as ColumnDef<PointOfSaleWithBranch, any>,
        ]
      : []),
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={pointsOfSale}
        getRowId={(p) => p.id}
        searchPlaceholder="Buscar punto de venta..."
        toolbar={toolbar}
        emptyMessage="Todavía no hay puntos de venta."
        renderMobileCard={(pointOfSale) => (
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">
                {pointOfSale.code} — {pointOfSale.name}
              </p>
              <p className="text-sm text-muted-foreground">{pointOfSale.branchName}</p>
            </div>
            <ActiveStatusBadge isActive={pointOfSale.isActive} />
          </div>
        )}
      />

      {confirmTarget && (
        <ConfirmDialog
          open={Boolean(confirmTarget)}
          onOpenChange={(open) => !open && setConfirmTarget(null)}
          title={confirmTarget.action === 'deactivate' ? 'Desactivar punto de venta' : 'Activar punto de venta'}
          description={`¿Confirmás ${confirmTarget.action === 'deactivate' ? 'desactivar' : 'activar'} "${confirmTarget.pointOfSale.name}"?`}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}
