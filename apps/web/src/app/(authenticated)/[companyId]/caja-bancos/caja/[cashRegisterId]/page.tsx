'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import {
  useAllCashRegisters,
  useCashSessions,
  isCashSessionOpen,
} from '@/lib/api/treasury/cash-bank';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { ActiveStatusBadge } from '@/components/shared/status-badge';
import { CashRegisterSheet } from '@/components/caja-bancos/cash-register-sheet';
import { CashSessionsTable } from '@/components/caja-bancos/cash-sessions-table';
import { OpenSessionDialog } from '@/components/caja-bancos/open-session-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CashRegisterDetailPage({
  params,
}: {
  params: Promise<{ companyId: string; cashRegisterId: string }>;
}) {
  const { companyId, cashRegisterId } = use(params);
  const router = useRouter();
  // Sin GET individual scoped a companyId (solo bajo branches/:branchId/...
  // con un branchId que acá todavía no conocemos) — se busca en la lista ya
  // cacheada, mismo criterio que el detalle de Depósito (F4).
  const { cashRegisters, isLoading: registersLoading } = useAllCashRegisters(companyId);
  const cashRegister = cashRegisters.find((r) => r.id === cashRegisterId);
  const sessions = useCashSessions(companyId, cashRegister?.branchId ?? '', cashRegisterId);
  const { membership } = useCurrentMembership(companyId);
  const canManage = membership ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName) : false;

  const [editOpen, setEditOpen] = useState(false);
  const [openSessionDialog, setOpenSessionDialog] = useState(false);

  if (registersLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (!cashRegister) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">Esta caja no existe.</p>
        <Link href={`/${companyId}/caja-bancos/caja`} className="text-sm underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  const openSession = (sessions.data ?? []).find(isCashSessionOpen);

  return (
    <div className="space-y-4">
      <Link
        href={`/${companyId}/caja-bancos/caja`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Caja
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">{cashRegister.name}</h1>
          <ActiveStatusBadge isActive={cashRegister.isActive} />
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              Editar
            </Button>
            {openSession ? (
              <Button
                onClick={() =>
                  router.push(
                    `/${companyId}/caja-bancos/caja/${cashRegisterId}/sesiones/${openSession.id}`,
                  )
                }
              >
                Ver turno abierto
              </Button>
            ) : (
              cashRegister.isActive && <Button onClick={() => setOpenSessionDialog(true)}>Abrir turno</Button>
            )}
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground">Sucursal: {cashRegister.branchName}</p>

      <Card>
        <CardHeader>
          <CardTitle>Historial de sesiones</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : (
            <CashSessionsTable
              companyId={companyId}
              cashRegisterId={cashRegisterId}
              sessions={sessions.data ?? []}
            />
          )}
        </CardContent>
      </Card>

      <CashRegisterSheet
        companyId={companyId}
        open={editOpen}
        onOpenChange={setEditOpen}
        cashRegister={cashRegister}
      />

      <OpenSessionDialog
        companyId={companyId}
        open={openSessionDialog}
        onOpenChange={setOpenSessionDialog}
        cashRegisters={[cashRegister]}
        fixedCashRegister={cashRegister}
        onOpened={(sessionId) =>
          router.push(`/${companyId}/caja-bancos/caja/${cashRegisterId}/sesiones/${sessionId}`)
        }
      />
    </div>
  );
}
