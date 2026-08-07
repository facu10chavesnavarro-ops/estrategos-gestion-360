'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import {
  useAllCashRegisters,
  useCashSessions,
  useCashMovements,
  isCashSessionOpen,
  computeCashSessionBalance,
} from '@/lib/api/treasury/cash-bank';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { formatMoney } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import { CashMovementsTable } from '@/components/caja-bancos/cash-movements-table';
import { CashMovementDialog } from '@/components/caja-bancos/cash-movement-dialog';
import { CloseSessionDialog } from '@/components/caja-bancos/close-session-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CashSessionDetailPage({
  params,
}: {
  params: { companyId: string; cashRegisterId: string; cashSessionId: string };
}) {
  const { cashRegisters, isLoading: registersLoading } = useAllCashRegisters(params.companyId);
  const cashRegister = cashRegisters.find((r) => r.id === params.cashRegisterId);
  const sessions = useCashSessions(params.companyId, cashRegister?.branchId ?? '', params.cashRegisterId);
  const session = (sessions.data ?? []).find((s) => s.id === params.cashSessionId);
  const movements = useCashMovements(params.companyId, params.cashSessionId);
  const { membership } = useCurrentMembership(params.companyId);
  const canManage = membership ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName) : false;

  const [movementDialog, setMovementDialog] = useState<'IN' | 'OUT' | null>(null);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  if (registersLoading || sessions.isLoading || movements.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (!cashRegister || !session) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">Esta sesión no existe.</p>
        <Link href={`/${params.companyId}/caja-bancos/caja`} className="text-sm underline">
          Volver a Caja
        </Link>
      </div>
    );
  }

  const isOpen = isCashSessionOpen(session);
  const currentBalance = computeCashSessionBalance(session, movements.data ?? []);

  return (
    <div className="space-y-4">
      <Link
        href={`/${params.companyId}/caja-bancos/caja/${params.cashRegisterId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {cashRegister.name}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">
            Turno del {new Date(session.openedAt).toLocaleDateString('es-AR')}
          </h1>
          {isOpen ? (
            <StatusBadge label="Abierta" tone="active" />
          ) : (
            <StatusBadge label="Cerrada" tone="neutral" />
          )}
        </div>
        {canManage && isOpen && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setMovementDialog('IN')}>
              + Ingreso
            </Button>
            <Button variant="outline" onClick={() => setMovementDialog('OUT')}>
              + Egreso
            </Button>
            <Button onClick={() => setCloseDialogOpen(true)}>Cerrar turno</Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{isOpen ? 'Saldo corriente' : 'Resumen del cierre'}</span>
            <span className="font-mono text-base font-normal">
              {isOpen ? formatMoney(currentBalance) : formatMoney(session.expectedBalance ?? '0')}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Saldo inicial</span>
            <span className="font-mono">{formatMoney(session.openingBalance)}</span>
          </div>
          {!isOpen && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo esperado</span>
                <span className="font-mono">{formatMoney(session.expectedBalance ?? '0')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo contado</span>
                <span className="font-mono">{formatMoney(session.closingBalance ?? '0')}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 font-semibold">
                <span>Diferencia</span>
                <span
                  className={
                    Number(session.difference) === 0
                      ? 'font-mono'
                      : 'font-mono text-destructive'
                  }
                >
                  {formatMoney(session.difference ?? '0')}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <CashMovementsTable companyId={params.companyId} movements={movements.data ?? []} />
        </CardContent>
      </Card>

      {movementDialog && (
        <CashMovementDialog
          companyId={params.companyId}
          cashSessionId={params.cashSessionId}
          type={movementDialog}
          open={Boolean(movementDialog)}
          onOpenChange={(open) => !open && setMovementDialog(null)}
        />
      )}

      <CloseSessionDialog
        companyId={params.companyId}
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        session={session}
        movements={movements.data ?? []}
      />
    </div>
  );
}
