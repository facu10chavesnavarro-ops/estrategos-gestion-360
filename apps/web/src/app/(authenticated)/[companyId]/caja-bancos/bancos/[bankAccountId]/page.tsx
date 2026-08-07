'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import {
  useBankAccountsWithBalance,
  useBankMovements,
} from '@/lib/api/treasury/cash-bank';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { formatMoney } from '@/lib/utils';
import { ActiveStatusBadge } from '@/components/shared/status-badge';
import { BankAccountSheet } from '@/components/caja-bancos/bank-account-sheet';
import { BankMovementsTable } from '@/components/caja-bancos/bank-movements-table';
import { BankMovementDialog } from '@/components/caja-bancos/bank-movement-dialog';
import { BankTransferDialog } from '@/components/caja-bancos/bank-transfer-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function BankAccountDetailPage({
  params,
}: {
  params: { companyId: string; bankAccountId: string };
}) {
  const { accounts, isLoading: accountsLoading } = useBankAccountsWithBalance(params.companyId);
  const bankAccount = accounts.find((a) => a.id === params.bankAccountId);
  const movements = useBankMovements(params.companyId, params.bankAccountId);
  const { membership } = useCurrentMembership(params.companyId);
  const canManage = membership ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName) : false;

  const [editOpen, setEditOpen] = useState(false);
  const [movementDialog, setMovementDialog] = useState<'DEPOSIT' | 'WITHDRAWAL' | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

  if (accountsLoading || movements.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (!bankAccount) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">Esta cuenta bancaria no existe.</p>
        <Link href={`/${params.companyId}/caja-bancos/bancos`} className="text-sm underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  const otherActiveAccounts = accounts.filter((a) => a.id !== bankAccount.id && a.isActive);

  return (
    <div className="space-y-4">
      <Link
        href={`/${params.companyId}/caja-bancos/bancos`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Bancos
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">
            {bankAccount.bankName}
            {bankAccount.alias ? ` — ${bankAccount.alias}` : ''}
          </h1>
          <ActiveStatusBadge isActive={bankAccount.isActive} />
        </div>
        {canManage && bankAccount.isActive && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              Editar
            </Button>
            <Button variant="outline" onClick={() => setMovementDialog('DEPOSIT')}>
              + Ingreso
            </Button>
            <Button variant="outline" onClick={() => setMovementDialog('WITHDRAWAL')}>
              + Egreso
            </Button>
            {otherActiveAccounts.length > 0 && (
              <Button onClick={() => setTransferOpen(true)}>Transferir</Button>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Saldo</span>
            <span className="font-mono text-base font-normal">{formatMoney(bankAccount.balance)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>CBU/CVU: {bankAccount.cbu ?? '—'}</p>
          <p>N.º de cuenta: {bankAccount.accountNumber ?? '—'}</p>
          <p>Moneda: {bankAccount.currency}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <BankMovementsTable companyId={params.companyId} movements={movements.data ?? []} />
        </CardContent>
      </Card>

      <BankAccountSheet
        companyId={params.companyId}
        open={editOpen}
        onOpenChange={setEditOpen}
        bankAccount={bankAccount}
      />

      {movementDialog && (
        <BankMovementDialog
          companyId={params.companyId}
          bankAccountId={params.bankAccountId}
          type={movementDialog}
          open={Boolean(movementDialog)}
          onOpenChange={(open) => !open && setMovementDialog(null)}
        />
      )}

      <BankTransferDialog
        companyId={params.companyId}
        sourceAccount={bankAccount}
        otherAccounts={otherActiveAccounts}
        open={transferOpen}
        onOpenChange={setTransferOpen}
      />
    </div>
  );
}
