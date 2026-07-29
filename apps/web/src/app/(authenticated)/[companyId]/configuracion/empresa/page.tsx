'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import {
  useCompany,
  useBranches,
  useActivateBranch,
  useDeactivateBranch,
  type Branch,
} from '@/lib/api/companies';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { ApiError } from '@/lib/api/http-client';
import { CompanyForm } from '@/components/configuracion/company-form';
import { BranchSheet } from '@/components/configuracion/branch-sheet';
import { DataTable } from '@/components/shared/data-table';
import { ActiveStatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ConfirmTarget = { branch: Branch; action: 'activate' | 'deactivate' };

export default function EmpresaPage({ params }: { params: { companyId: string } }) {
  const { companyId } = params;
  const company = useCompany(companyId);
  const branches = useBranches(companyId);
  const { membership } = useCurrentMembership(companyId);
  const canManage = membership
    ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName)
    : false;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | undefined>();
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);

  const activateBranch = useActivateBranch(companyId);
  const deactivateBranch = useDeactivateBranch(companyId);

  function openCreate() {
    setEditingBranch(undefined);
    setSheetOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditingBranch(branch);
    setSheetOpen(true);
  }

  async function handleConfirm(reason?: string) {
    if (!confirmTarget) return;
    try {
      if (confirmTarget.action === 'deactivate') {
        await deactivateBranch.mutateAsync({ branchId: confirmTarget.branch.id, reason });
        toast.success('Sucursal desactivada');
      } else {
        await activateBranch.mutateAsync({ branchId: confirmTarget.branch.id });
        toast.success('Sucursal activada');
      }
      setConfirmTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo completar la acción');
    }
  }

  const columns: ColumnDef<Branch, any>[] = [
    { accessorKey: 'name', header: 'Nombre' },
    {
      accessorKey: 'address',
      header: 'Dirección',
      cell: ({ row }) => row.original.address ?? '—',
    },
    {
      accessorKey: 'phone',
      header: 'Teléfono',
      cell: ({ row }) => row.original.phone ?? '—',
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
            cell: ({ row }: { row: { original: Branch } }) => (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(row.original)}>
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      setConfirmTarget({
                        branch: row.original,
                        action: row.original.isActive ? 'deactivate' : 'activate',
                      })
                    }
                  >
                    {row.original.isActive ? 'Desactivar' : 'Activar'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]
      : []),
  ];

  if (company.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (company.isError || !company.data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">
          {company.error instanceof ApiError
            ? company.error.message
            : 'No se pudieron cargar los datos de la empresa.'}
        </p>
        <Button variant="outline" onClick={() => company.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <CompanyForm company={company.data} readOnly={!canManage} />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Sucursales</h2>
          {canManage && <Button onClick={openCreate}>+ Nueva sucursal</Button>}
        </div>
        <DataTable
          columns={columns}
          data={branches.data ?? []}
          getRowId={(b) => b.id}
          searchPlaceholder="Buscar sucursal..."
          emptyMessage="Todavía no hay sucursales cargadas."
          emptyAction={
            canManage ? <Button onClick={openCreate}>+ Nueva sucursal</Button> : undefined
          }
          renderMobileCard={(branch) => (
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{branch.name}</p>
                <p className="text-sm text-muted-foreground">
                  {branch.address ?? 'Sin dirección'}
                </p>
              </div>
              <ActiveStatusBadge isActive={branch.isActive} />
            </div>
          )}
        />
      </div>

      <BranchSheet
        companyId={companyId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        branch={editingBranch}
      />

      {confirmTarget && (
        <ConfirmDialog
          open={Boolean(confirmTarget)}
          onOpenChange={(open) => !open && setConfirmTarget(null)}
          title={confirmTarget.action === 'deactivate' ? 'Desactivar sucursal' : 'Activar sucursal'}
          description={`¿Confirmás ${confirmTarget.action === 'deactivate' ? 'desactivar' : 'activar'} "${confirmTarget.branch.name}"?`}
          requireReason={confirmTarget.action === 'deactivate'}
          variant={confirmTarget.action === 'deactivate' ? 'destructive' : 'default'}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
