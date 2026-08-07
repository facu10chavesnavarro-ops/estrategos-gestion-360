'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useAllCashRegisters,
  useOpenCashSessions,
  useCashBankOverview,
  type CashRegisterWithBranch,
} from '@/lib/api/treasury/cash-bank';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { formatMoney } from '@/lib/utils';
import { CashRegistersTable } from '@/components/caja-bancos/cash-registers-table';
import { CashRegisterSheet } from '@/components/caja-bancos/cash-register-sheet';
import { OpenSessionDialog } from '@/components/caja-bancos/open-session-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type StatusFilter = 'all' | 'active' | 'inactive';

/** Vista general + listado de cajas (F7 §5.1). */
export default function CajaPage({ params }: { params: { companyId: string } }) {
  const router = useRouter();
  const { cashRegisters, isLoading } = useAllCashRegisters(params.companyId);
  const { openSessions, isLoading: sessionsLoading } = useOpenCashSessions(params.companyId);
  const { totalCash, isLoading: overviewLoading } = useCashBankOverview(params.companyId);
  const { membership, isLoading: membershipLoading } = useCurrentMembership(params.companyId);
  const canManage =
    !membershipLoading && membership
      ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName)
      : false;

  const [status, setStatus] = useState<StatusFilter>('all');
  const [sheetTarget, setSheetTarget] = useState<{ open: boolean; cashRegister?: CashRegisterWithBranch }>({
    open: false,
  });
  const [openSessionDialog, setOpenSessionDialog] = useState(false);

  const openRegisterIds = new Set(openSessions.map((s) => s.cashRegisterId));
  const registersWithoutSession = cashRegisters.filter((r) => r.isActive && !openRegisterIds.has(r.id));

  const filtered = cashRegisters.filter((r) => {
    if (status === 'active') return r.isActive;
    if (status === 'inactive') return !r.isActive;
    return true;
  });

  if (isLoading || membershipLoading || sessionsLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Efectivo en cajas abiertas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-semibold">
              {overviewLoading ? '…' : formatMoney(totalCash)}
            </p>
          </CardContent>
        </Card>
      </div>

      <CashRegistersTable
        companyId={params.companyId}
        cashRegisters={filtered}
        openRegisterIds={openRegisterIds}
        canManage={canManage}
        onEdit={(cashRegister) => setSheetTarget({ open: true, cashRegister })}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onValueChange={(v) => v && setStatus(v as StatusFilter)}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="inactive">Inactivas</SelectItem>
              </SelectContent>
            </Select>
            {canManage && (
              <>
                {registersWithoutSession.length > 0 && (
                  <Button variant="outline" onClick={() => setOpenSessionDialog(true)}>
                    Abrir turno
                  </Button>
                )}
                <Button onClick={() => setSheetTarget({ open: true, cashRegister: undefined })}>
                  + Nueva caja
                </Button>
              </>
            )}
          </div>
        }
      />

      <CashRegisterSheet
        companyId={params.companyId}
        open={sheetTarget.open}
        onOpenChange={(open) => setSheetTarget((s) => ({ ...s, open }))}
        cashRegister={sheetTarget.cashRegister}
      />

      <OpenSessionDialog
        companyId={params.companyId}
        open={openSessionDialog}
        onOpenChange={setOpenSessionDialog}
        cashRegisters={registersWithoutSession}
        onOpened={(sessionId, cashRegisterId) =>
          router.push(`/${params.companyId}/caja-bancos/caja/${cashRegisterId}/sesiones/${sessionId}`)
        }
      />
    </div>
  );
}
