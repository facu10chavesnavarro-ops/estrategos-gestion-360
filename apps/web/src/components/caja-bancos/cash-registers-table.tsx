'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  type CashRegisterWithBranch,
  useActivateCashRegister,
  useDeactivateCashRegister,
} from '@/lib/api/treasury/cash-bank';
import { ApiError } from '@/lib/api/http-client';
import { DataTable } from '@/components/shared/data-table';
import { ActiveStatusBadge, StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';

type ConfirmTarget = { cashRegister: CashRegisterWithBranch; action: 'activate' | 'deactivate' };

/** Listado de cajas (F7 §5.1) — mismo patrón que WarehousesTable (F4). */
export function CashRegistersTable({
  companyId,
  cashRegisters,
  openRegisterIds,
  canManage,
  onEdit,
  toolbar,
}: {
  companyId: string;
  cashRegisters: CashRegisterWithBranch[];
  /** Ids de cajas con una sesión abierta ahora mismo (RN-CASH-02: a lo sumo una). */
  openRegisterIds: Set<string>;
  canManage: boolean;
  onEdit: (cashRegister: CashRegisterWithBranch) => void;
  toolbar?: React.ReactNode;
}) {
  const activateCashRegister = useActivateCashRegister(companyId);
  const deactivateCashRegister = useDeactivateCashRegister(companyId);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);

  async function handleConfirm() {
    if (!confirmTarget) return;
    try {
      const { id: cashRegisterId, branchId } = confirmTarget.cashRegister;
      if (confirmTarget.action === 'deactivate') {
        await deactivateCashRegister.mutateAsync({ branchId, cashRegisterId });
        toast.success('Caja desactivada');
      } else {
        await activateCashRegister.mutateAsync({ branchId, cashRegisterId });
        toast.success('Caja activada');
      }
      setConfirmTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo completar la acción');
    }
  }

  const columns: ColumnDef<CashRegisterWithBranch, any>[] = [
    {
      accessorKey: 'name',
      header: 'Nombre',
      cell: ({ row }) => (
        <Link
          href={`/${companyId}/caja-bancos/caja/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    { accessorKey: 'branchName', header: 'Sucursal' },
    {
      id: 'session',
      header: 'Sesión',
      cell: ({ row }) =>
        openRegisterIds.has(row.original.id) ? (
          <StatusBadge label="Abierta" tone="active" />
        ) : (
          <StatusBadge label="Cerrada" tone="neutral" />
        ),
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
            cell: ({ row }: { row: { original: CashRegisterWithBranch } }) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setConfirmTarget({
                      cashRegister: row.original,
                      action: row.original.isActive ? 'deactivate' : 'activate',
                    })
                  }
                >
                  {row.original.isActive ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            ),
          } as ColumnDef<CashRegisterWithBranch, any>,
        ]
      : []),
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={cashRegisters}
        getRowId={(r) => r.id}
        searchPlaceholder="Buscar caja..."
        toolbar={toolbar}
        emptyMessage="Todavía no hay cajas."
        renderMobileCard={(cashRegister) => (
          <Link
            href={`/${companyId}/caja-bancos/caja/${cashRegister.id}`}
            className="flex items-start justify-between gap-2"
          >
            <div>
              <p className="font-medium">{cashRegister.name}</p>
              <p className="text-sm text-muted-foreground">{cashRegister.branchName}</p>
            </div>
            <ActiveStatusBadge isActive={cashRegister.isActive} />
          </Link>
        )}
      />

      {confirmTarget && (
        <ConfirmDialog
          open={Boolean(confirmTarget)}
          onOpenChange={(open) => !open && setConfirmTarget(null)}
          title={confirmTarget.action === 'deactivate' ? 'Desactivar caja' : 'Activar caja'}
          description={`¿Confirmás ${confirmTarget.action === 'deactivate' ? 'desactivar' : 'activar'} "${confirmTarget.cashRegister.name}"?`}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}
