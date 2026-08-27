'use client';

import { use, useState } from 'react';
import { useChartOfAccounts, type ChartOfAccount } from '@/lib/api/accounting/chart-of-accounts';
import { useAccountingSettings } from '@/lib/api/accounting/settings';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { ApiError } from '@/lib/api/http-client';
import { AccountingActivationCard } from '@/components/contabilidad/accounting-activation-card';
import { ChartOfAccountsTree } from '@/components/contabilidad/chart-of-accounts-tree';
import { ChartOfAccountSheet } from '@/components/contabilidad/chart-of-account-sheet';
import { Button } from '@/components/ui/button';

/** Plan de Cuentas: árbol, alta/edición/activar/desactivar (F8 §5.2). */
export default function PlanDeCuentasPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const settings = useAccountingSettings(companyId);
  const accounts = useChartOfAccounts(companyId);
  const { membership, isLoading: membershipLoading } = useCurrentMembership(companyId);
  const canManage =
    !membershipLoading && membership
      ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName)
      : false;

  const [sheetTarget, setSheetTarget] = useState<{
    open: boolean;
    account?: ChartOfAccount;
    defaultParentId?: string;
  }>({ open: false });

  if (settings.isLoading || membershipLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (!settings.isSuccess) {
    return <AccountingActivationCard companyId={companyId} canManage={canManage} />;
  }

  if (accounts.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (accounts.isError) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">
          {accounts.error instanceof ApiError
            ? accounts.error.message
            : 'No se pudo cargar el Plan de Cuentas.'}
        </p>
        <Button variant="outline" onClick={() => accounts.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setSheetTarget({ open: true })}>+ Nueva cuenta</Button>
        </div>
      )}

      <ChartOfAccountsTree
        companyId={companyId}
        accounts={accounts.data ?? []}
        canManage={canManage}
        onEdit={(account) => setSheetTarget({ open: true, account })}
        onAddChild={(parentId) => setSheetTarget({ open: true, defaultParentId: parentId })}
      />

      <ChartOfAccountSheet
        companyId={companyId}
        open={sheetTarget.open}
        onOpenChange={(open) => setSheetTarget((s) => ({ ...s, open }))}
        accounts={accounts.data ?? []}
        account={sheetTarget.account}
        defaultParentId={sheetTarget.defaultParentId}
      />
    </div>
  );
}
