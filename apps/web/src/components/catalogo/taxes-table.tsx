'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { useCloseTax, type Tax } from '@/lib/api/catalog/taxes';
import { ApiError } from '@/lib/api/http-client';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';

function isCurrentlyValid(tax: Tax): boolean {
  return !tax.validTo || new Date(tax.validTo) > new Date();
}

export function TaxesTable({
  companyId,
  taxes,
  canManage,
  onEdit,
  toolbar,
}: {
  companyId: string;
  taxes: Tax[];
  canManage: boolean;
  onEdit: (tax: Tax) => void;
  toolbar?: React.ReactNode;
}) {
  const closeTax = useCloseTax(companyId);
  const [closeTarget, setCloseTarget] = useState<Tax | null>(null);

  async function handleClose() {
    if (!closeTarget) return;
    try {
      await closeTax.mutateAsync(closeTarget.id);
      toast.success('Vigencia cerrada');
      setCloseTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo cerrar la vigencia');
    }
  }

  const columns: ColumnDef<Tax, any>[] = [
    { accessorKey: 'name', header: 'Nombre' },
    { accessorKey: 'type', header: 'Tipo' },
    { accessorKey: 'rate', header: 'Tasa (%)' },
    {
      accessorKey: 'validFrom',
      header: 'Vigente desde',
      cell: ({ row }) => new Date(row.original.validFrom).toLocaleDateString('es-AR'),
    },
    {
      accessorKey: 'validTo',
      header: 'Vigente hasta',
      cell: ({ row }) =>
        row.original.validTo ? new Date(row.original.validTo).toLocaleDateString('es-AR') : '—',
    },
    {
      id: 'status',
      header: 'Estado',
      cell: ({ row }) => (
        <StatusBadge
          label={isCurrentlyValid(row.original) ? 'Vigente' : 'No vigente'}
          tone={isCurrentlyValid(row.original) ? 'active' : 'inactive'}
        />
      ),
    },
    ...(canManage
      ? [
          {
            id: 'actions',
            header: '',
            cell: ({ row }: { row: { original: Tax } }) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
                  Editar
                </Button>
                {isCurrentlyValid(row.original) && (
                  <Button variant="ghost" size="sm" onClick={() => setCloseTarget(row.original)}>
                    Cerrar vigencia
                  </Button>
                )}
              </div>
            ),
          } as ColumnDef<Tax, any>,
        ]
      : []),
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={taxes}
        getRowId={(t) => t.id}
        searchPlaceholder="Buscar impuesto..."
        toolbar={toolbar}
        emptyMessage="Todavía no hay impuestos."
        renderMobileCard={(tax) => (
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{tax.name}</p>
              <p className="text-sm text-muted-foreground">{tax.rate}%</p>
            </div>
            <StatusBadge
              label={isCurrentlyValid(tax) ? 'Vigente' : 'No vigente'}
              tone={isCurrentlyValid(tax) ? 'active' : 'inactive'}
            />
          </div>
        )}
      />

      {closeTarget && (
        <ConfirmDialog
          open={Boolean(closeTarget)}
          onOpenChange={(open) => !open && setCloseTarget(null)}
          title="Cerrar vigencia"
          description={`¿Confirmás cerrar la vigencia de "${closeTarget.name}" a partir de hoy?`}
          onConfirm={handleClose}
        />
      )}
    </>
  );
}
