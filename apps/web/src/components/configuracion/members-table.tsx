'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useMembers,
  useChangeMemberRole,
  useActivateMember,
  useDeactivateMember,
  useRoles,
  type Member,
} from '@/lib/api/users';
import { useSessionStore } from '@/lib/stores/use-session-store';
import { ApiError } from '@/lib/api/http-client';
import { DataTable } from '@/components/shared/data-table';
import { ActiveStatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ConfirmTarget = { member: Member; action: 'activate' | 'deactivate' };

export function MembersTable({ companyId }: { companyId: string }) {
  const currentUserId = useSessionStore((state) => state.user?.id);
  const members = useMembers(companyId);
  const roles = useRoles();
  const changeMemberRole = useChangeMemberRole(companyId);
  const activateMember = useActivateMember(companyId);
  const deactivateMember = useDeactivateMember(companyId);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);

  async function handleRoleChange(userId: string, roleId: string) {
    try {
      await changeMemberRole.mutateAsync({ userId, roleId });
      toast.success('Rol actualizado');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo cambiar el rol');
    }
  }

  async function handleConfirm() {
    if (!confirmTarget) return;
    try {
      if (confirmTarget.action === 'deactivate') {
        await deactivateMember.mutateAsync(confirmTarget.member.userId);
        toast.success('Acceso desactivado');
      } else {
        await activateMember.mutateAsync(confirmTarget.member.userId);
        toast.success('Acceso activado');
      }
      setConfirmTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo completar la acción');
    }
  }

  const columns: ColumnDef<Member, any>[] = [
    {
      accessorKey: 'fullName',
      header: 'Nombre',
      cell: ({ row }) => (
        <span>
          {row.original.fullName}
          {row.original.userId === currentUserId && (
            <span className="ml-1 text-xs text-muted-foreground">(vos)</span>
          )}
        </span>
      ),
    },
    { accessorKey: 'email', header: 'Email' },
    {
      id: 'role',
      header: 'Rol',
      cell: ({ row }) => {
        const isSelf = row.original.userId === currentUserId;
        if (isSelf || !roles.data) {
          return <span>{row.original.roleName}</span>;
        }
        return (
          <Select
            value={row.original.roleId}
            onValueChange={(roleId) => roleId && handleRoleChange(row.original.userId, roleId)}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.data.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },
    {
      id: 'status',
      header: 'Estado',
      cell: ({ row }) => <ActiveStatusBadge isActive={row.original.isActive} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const isSelf = row.original.userId === currentUserId;
        if (isSelf) {
          return (
            <span
              className="text-xs text-muted-foreground"
              title="No podés modificar tu propio acceso o rol"
            >
              —
            </span>
          );
        }
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setConfirmTarget({
                member: row.original,
                action: row.original.isActive ? 'deactivate' : 'activate',
              })
            }
          >
            {row.original.isActive ? 'Desactivar' : 'Activar'}
          </Button>
        );
      },
    },
  ];

  if (members.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (members.isError) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">
          {members.error instanceof ApiError
            ? members.error.message
            : 'No se pudieron cargar los miembros.'}
        </p>
        <Button variant="outline" onClick={() => members.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={members.data ?? []}
        getRowId={(m) => m.userId}
        searchPlaceholder="Buscar miembro..."
        emptyMessage="Todavía no hay miembros."
        renderMobileCard={(member) => (
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">
                {member.fullName}
                {member.userId === currentUserId && (
                  <span className="ml-1 text-xs text-muted-foreground">(vos)</span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">{member.email}</p>
              <p className="text-sm text-muted-foreground">{member.roleName}</p>
            </div>
            <ActiveStatusBadge isActive={member.isActive} />
          </div>
        )}
      />

      {confirmTarget && (
        <ConfirmDialog
          open={Boolean(confirmTarget)}
          onOpenChange={(open) => !open && setConfirmTarget(null)}
          title={confirmTarget.action === 'deactivate' ? 'Desactivar acceso' : 'Activar acceso'}
          description={`¿Confirmás ${confirmTarget.action === 'deactivate' ? 'desactivar' : 'activar'} el acceso de "${confirmTarget.member.fullName}"?`}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}
