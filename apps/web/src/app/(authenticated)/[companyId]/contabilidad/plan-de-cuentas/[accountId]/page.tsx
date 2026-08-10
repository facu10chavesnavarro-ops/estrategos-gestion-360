'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useAccountLedger,
  useChartOfAccounts,
} from '@/lib/api/accounting/chart-of-accounts';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { ApiError } from '@/lib/api/http-client';
import { ChartOfAccountSheet } from '@/components/contabilidad/chart-of-account-sheet';
import { AccountLedgerTable } from '@/components/contabilidad/account-ledger-table';
import { ActiveStatusBadge, StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TYPE_LABELS: Record<string, string> = {
  ASSET: 'Activo',
  LIABILITY: 'Pasivo',
  EQUITY: 'Patrimonio Neto',
  INCOME: 'Ingreso',
  EXPENSE: 'Egreso',
};

/** Detalle de cuenta + su Libro Mayor (F8 §5.3). */
export default function ChartOfAccountDetailPage({
  params,
}: {
  params: { companyId: string; accountId: string };
}) {
  const ledger = useAccountLedger(params.companyId, params.accountId);
  const accounts = useChartOfAccounts(params.companyId);
  const { membership, isLoading: membershipLoading } = useCurrentMembership(params.companyId);
  const canManage =
    !membershipLoading && membership
      ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName)
      : false;
  const [editOpen, setEditOpen] = useState(false);

  if (ledger.isLoading || accounts.isLoading || membershipLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (ledger.isError || !ledger.data) {
    return (
      <p className="text-sm text-destructive">
        {ledger.error instanceof ApiError ? ledger.error.message : 'No se pudo cargar la cuenta.'}
      </p>
    );
  }

  const { account, movements } = ledger.data;
  const parent = account.parentId
    ? (accounts.data ?? []).find((a) => a.id === account.parentId)
    : undefined;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <span className="font-mono">{account.code}</span>
              <span>{account.name}</span>
            </CardTitle>
            {canManage && (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <StatusBadge label={TYPE_LABELS[account.type] ?? account.type} tone="neutral" />
          <StatusBadge
            label={account.allowsMovements ? 'Imputable' : 'Agrupadora'}
            tone={account.allowsMovements ? 'active' : 'neutral'}
          />
          <ActiveStatusBadge isActive={account.isActive} />
          {parent && (
            <Link
              href={`/${params.companyId}/contabilidad/plan-de-cuentas/${parent.id}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              Padre: {parent.code} — {parent.name}
            </Link>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Libro Mayor</h2>
        <AccountLedgerTable companyId={params.companyId} movements={movements} />
      </div>

      <ChartOfAccountSheet
        companyId={params.companyId}
        open={editOpen}
        onOpenChange={setEditOpen}
        accounts={accounts.data ?? []}
        account={account}
      />
    </div>
  );
}
