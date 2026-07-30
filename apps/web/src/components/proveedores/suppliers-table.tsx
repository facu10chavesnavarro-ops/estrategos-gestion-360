'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useActivateSupplier,
  useDeactivateSupplier,
  type Supplier,
} from '@/lib/api/suppliers';
import { ApiError } from '@/lib/api/http-client';
import { DataTable } from '@/components/shared/data-table';
import { ActiveStatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';

type ConfirmTarget = { supplier: Supplier; action: 'activate' | 'deactivate' };

export function SuppliersTable({
  companyId,
  suppliers,
  canManage,
  onEdit,
  toolbar,
}: {
  companyId: string;
  suppliers: Supplier[];
  canManage: boolean;
  onEdit: (supplier: Supplier) => void;
  toolbar?: React.ReactNode;
}) {
  const activateSupplier = useActivateSupplier(companyId);
  const deactivateSupplier = useDeactivateSupplier(companyId);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);

  async function handleConfirm() {
    if (!confirmTarget) return;
    try {
      if (confirmTarget.action === 'deactivate') {
        await deactivateSupplier.mutateAsync(confirmTarget.supplier.id);
        toast.success('Proveedor desactivado');
      } else {
        await activateSupplier.mutateAsync(confirmTarget.supplier.id);
        toast.success('Proveedor activado');
      }
      setConfirmTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo completar la acción');
    }
  }

  const columns: ColumnDef<Supplier, any>[] = [
    {
      accessorKey: 'legalName',
      header: 'Razón social',
      cell: ({ row }) => (
        <Link
          href={`/${companyId}/proveedores/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.legalName}
        </Link>
      ),
    },
    { accessorKey: 'taxId', header: 'CUIT', cell: ({ row }) => row.original.taxId ?? '—' },
    {
      accessorKey: 'paymentTermDays',
      header: 'Días de pago',
      cell: ({ row }) => row.original.paymentTermDays ?? '—',
    },
    {
      accessorKey: 'bankName',
      header: 'Banco',
      cell: ({ row }) => row.original.bankName ?? '—',
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
            cell: ({ row }: { row: { original: Supplier } }) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setConfirmTarget({
                      supplier: row.original,
                      action: row.original.isActive ? 'deactivate' : 'activate',
                    })
                  }
                >
                  {row.original.isActive ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            ),
          } as ColumnDef<Supplier, any>,
        ]
      : []),
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={suppliers}
        getRowId={(s) => s.id}
        searchPlaceholder="Buscar proveedor..."
        toolbar={toolbar}
        emptyMessage="Todavía no hay proveedores."
        renderMobileCard={(supplier) => (
          <Link
            href={`/${companyId}/proveedores/${supplier.id}`}
            className="flex items-start justify-between gap-2"
          >
            <div>
              <p className="font-medium">{supplier.legalName}</p>
              <p className="text-sm text-muted-foreground">{supplier.taxId ?? 'Sin CUIT'}</p>
            </div>
            <ActiveStatusBadge isActive={supplier.isActive} />
          </Link>
        )}
      />

      {confirmTarget && (
        <ConfirmDialog
          open={Boolean(confirmTarget)}
          onOpenChange={(open) => !open && setConfirmTarget(null)}
          title={confirmTarget.action === 'deactivate' ? 'Desactivar proveedor' : 'Activar proveedor'}
          description={`¿Confirmás ${confirmTarget.action === 'deactivate' ? 'desactivar' : 'activar'} a "${confirmTarget.supplier.legalName}"?`}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}
