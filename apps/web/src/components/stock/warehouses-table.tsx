'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  type WarehouseWithBranch,
  useActivateWarehouse,
  useDeactivateWarehouse,
} from '@/lib/api/inventory/warehouses';
import { ApiError } from '@/lib/api/http-client';
import { DataTable } from '@/components/shared/data-table';
import { ActiveStatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';

type ConfirmTarget = { warehouse: WarehouseWithBranch; action: 'activate' | 'deactivate' };

export function WarehousesTable({
  companyId,
  warehouses,
  canManage,
  onEdit,
  toolbar,
}: {
  companyId: string;
  warehouses: WarehouseWithBranch[];
  canManage: boolean;
  onEdit: (warehouse: WarehouseWithBranch) => void;
  toolbar?: React.ReactNode;
}) {
  const activateWarehouse = useActivateWarehouse(companyId);
  const deactivateWarehouse = useDeactivateWarehouse(companyId);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);

  async function handleConfirm() {
    if (!confirmTarget) return;
    try {
      const { id: warehouseId, branchId } = confirmTarget.warehouse;
      if (confirmTarget.action === 'deactivate') {
        await deactivateWarehouse.mutateAsync({ branchId, warehouseId });
        toast.success('Depósito desactivado');
      } else {
        await activateWarehouse.mutateAsync({ branchId, warehouseId });
        toast.success('Depósito activado');
      }
      setConfirmTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo completar la acción');
    }
  }

  const columns: ColumnDef<WarehouseWithBranch, any>[] = [
    {
      accessorKey: 'name',
      header: 'Nombre',
      cell: ({ row }) => (
        <Link
          href={`/${companyId}/stock/depositos/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
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
            cell: ({ row }: { row: { original: WarehouseWithBranch } }) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setConfirmTarget({
                      warehouse: row.original,
                      action: row.original.isActive ? 'deactivate' : 'activate',
                    })
                  }
                >
                  {row.original.isActive ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            ),
          } as ColumnDef<WarehouseWithBranch, any>,
        ]
      : []),
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={warehouses}
        getRowId={(w) => w.id}
        searchPlaceholder="Buscar depósito..."
        toolbar={toolbar}
        emptyMessage="Todavía no hay depósitos."
        renderMobileCard={(warehouse) => (
          <Link
            href={`/${companyId}/stock/depositos/${warehouse.id}`}
            className="flex items-start justify-between gap-2"
          >
            <div>
              <p className="font-medium">{warehouse.name}</p>
              <p className="text-sm text-muted-foreground">{warehouse.branchName}</p>
            </div>
            <ActiveStatusBadge isActive={warehouse.isActive} />
          </Link>
        )}
      />

      {confirmTarget && (
        <ConfirmDialog
          open={Boolean(confirmTarget)}
          onOpenChange={(open) => !open && setConfirmTarget(null)}
          title={confirmTarget.action === 'deactivate' ? 'Desactivar depósito' : 'Activar depósito'}
          description={`¿Confirmás ${confirmTarget.action === 'deactivate' ? 'desactivar' : 'activar'} "${confirmTarget.warehouse.name}"?`}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}
