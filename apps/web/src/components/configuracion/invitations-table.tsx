'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { useInvitations, useRevokeInvitation, type Invitation } from '@/lib/api/users';
import { ApiError } from '@/lib/api/http-client';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge, type StatusBadgeTone } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { CreateInvitationDialog } from './create-invitation-dialog';

const STATUS_LABEL: Record<Invitation['status'], string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  revoked: 'Revocada',
  expired: 'Vencida',
};

const STATUS_TONE: Record<Invitation['status'], StatusBadgeTone> = {
  pending: 'pending',
  accepted: 'active',
  revoked: 'inactive',
  expired: 'warning',
};

export function InvitationsTable({ companyId }: { companyId: string }) {
  const invitations = useInvitations(companyId);
  const revokeInvitation = useRevokeInvitation(companyId);
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);

  async function handleRevoke() {
    if (!revokeTarget) return;
    try {
      await revokeInvitation.mutateAsync(revokeTarget.id);
      toast.success('Invitación revocada');
      setRevokeTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo revocar la invitación');
    }
  }

  const columns: ColumnDef<Invitation, any>[] = [
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'roleName', header: 'Rol' },
    {
      id: 'status',
      header: 'Estado',
      cell: ({ row }) => (
        <StatusBadge
          label={STATUS_LABEL[row.original.status]}
          tone={STATUS_TONE[row.original.status]}
        />
      ),
    },
    {
      accessorKey: 'expiresAt',
      header: 'Vence',
      cell: ({ row }) => new Date(row.original.expiresAt).toLocaleDateString('es-AR'),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        row.original.status === 'pending' ? (
          <Button variant="ghost" size="sm" onClick={() => setRevokeTarget(row.original)}>
            Revocar
          </Button>
        ) : null,
    },
  ];

  if (invitations.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (invitations.isError) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">
          {invitations.error instanceof ApiError
            ? invitations.error.message
            : 'No se pudieron cargar las invitaciones.'}
        </p>
        <Button variant="outline" onClick={() => invitations.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Invitaciones enviadas</h3>
        <CreateInvitationDialog companyId={companyId} />
      </div>
      <DataTable
        columns={columns}
        data={invitations.data ?? []}
        getRowId={(i) => i.id}
        searchPlaceholder="Buscar invitación..."
        emptyMessage="Todavía no se enviaron invitaciones."
        emptyAction={<CreateInvitationDialog companyId={companyId} />}
        renderMobileCard={(invitation) => (
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{invitation.email}</p>
              <p className="text-sm text-muted-foreground">{invitation.roleName}</p>
            </div>
            <StatusBadge
              label={STATUS_LABEL[invitation.status]}
              tone={STATUS_TONE[invitation.status]}
            />
          </div>
        )}
      />

      {revokeTarget && (
        <ConfirmDialog
          open={Boolean(revokeTarget)}
          onOpenChange={(open) => !open && setRevokeTarget(null)}
          title="Revocar invitación"
          description={`¿Confirmás revocar la invitación a "${revokeTarget.email}"?`}
          variant="destructive"
          onConfirm={handleRevoke}
        />
      )}
    </>
  );
}
