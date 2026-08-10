'use client';

import { useState } from 'react';
import { useAccountLedger } from '@/lib/api/accounting/chart-of-accounts';
import { useAccountingSettings } from '@/lib/api/accounting/settings';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { AccountingActivationCard } from '@/components/contabilidad/accounting-activation-card';
import { AccountSelect } from '@/components/contabilidad/account-select';
import { AccountLedgerTable } from '@/components/contabilidad/account-ledger-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

/** Libro Mayor como destino propio: elegir cuenta → ver movimientos (F8 §4). */
export default function LibroMayorPage({ params }: { params: { companyId: string } }) {
  const settings = useAccountingSettings(params.companyId);
  const { membership, isLoading: membershipLoading } = useCurrentMembership(params.companyId);
  const canManage =
    !membershipLoading && membership
      ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName)
      : false;

  const [accountId, setAccountId] = useState<string | null>(null);
  const ledger = useAccountLedger(params.companyId, accountId ?? '');

  if (settings.isLoading || membershipLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (!settings.isSuccess) {
    return <AccountingActivationCard companyId={params.companyId} canManage={canManage} />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Elegir cuenta</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:max-w-sm">
          <Label>Cuenta imputable</Label>
          <AccountSelect companyId={params.companyId} value={accountId} onChange={setAccountId} />
        </CardContent>
      </Card>

      {accountId && (
        <div>
          {ledger.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : ledger.data ? (
            <AccountLedgerTable companyId={params.companyId} movements={ledger.data.movements} />
          ) : null}
        </div>
      )}
    </div>
  );
}
