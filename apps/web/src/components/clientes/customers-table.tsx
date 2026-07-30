'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useActivateCustomer,
  useDeactivateCustomer,
  type Customer,
} from '@/lib/api/customers';
import { ApiError } from '@/lib/api/http-client';
import { DataTable } from '@/components/shared/data-table';
import { ActiveStatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';

type ConfirmTarget = { customer: Customer; action: 'activate' | 'deactivate' };

export function CustomersTable({
  companyId,
  customers,
  canManage,
  onEdit,
  toolbar,
}: {
  companyId: string;
  customers: Customer[];
  canManage: boolean;
  onEdit: (customer: Customer) => void;
  toolbar?: React.ReactNode;
}) {
  const activateCustomer = useActivateCustomer(companyId);
  const deactivateCustomer = useDeactivateCustomer(companyId);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);

  async function handleConfirm() {
    if (!confirmTarget) return;
    try {
      if (confirmTarget.action === 'deactivate') {
        await deactivateCustomer.mutateAsync(confirmTarget.customer.id);
        toast.success('Cliente desactivado');
      } else {
        await activateCustomer.mutateAsync(confirmTarget.customer.id);
        toast.success('Cliente activado');
      }
      setConfirmTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo completar la acción');
    }
  }

  const columns: ColumnDef<Customer, any>[] = [
    {
      accessorKey: 'legalName',
      header: 'Razón social',
      cell: ({ row }) => (
        <Link
          href={`/${companyId}/clientes/${row.original.id}`}
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
      accessorKey: 'creditLimit',
      header: 'Límite de crédito',
      cell: ({ row }) => row.original.creditLimit ?? '—',
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
            cell: ({ row }: { row: { original: Customer } }) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setConfirmTarget({
                      customer: row.original,
                      action: row.original.isActive ? 'deactivate' : 'activate',
                    })
                  }
                >
                  {row.original.isActive ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            ),
          } as ColumnDef<Customer, any>,
        ]
      : []),
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={customers}
        getRowId={(c) => c.id}
        searchPlaceholder="Buscar cliente..."
        toolbar={toolbar}
        emptyMessage="Todavía no hay clientes."
        renderMobileCard={(customer) => (
          <Link href={`/${companyId}/clientes/${customer.id}`} className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{customer.legalName}</p>
              <p className="text-sm text-muted-foreground">{customer.taxId ?? 'Sin CUIT'}</p>
            </div>
            <ActiveStatusBadge isActive={customer.isActive} />
          </Link>
        )}
      />

      {confirmTarget && (
        <ConfirmDialog
          open={Boolean(confirmTarget)}
          onOpenChange={(open) => !open && setConfirmTarget(null)}
          title={confirmTarget.action === 'deactivate' ? 'Desactivar cliente' : 'Activar cliente'}
          description={`¿Confirmás ${confirmTarget.action === 'deactivate' ? 'desactivar' : 'activar'} a "${confirmTarget.customer.legalName}"?`}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}
