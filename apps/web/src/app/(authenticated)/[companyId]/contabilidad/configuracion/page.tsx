'use client';

import { use } from 'react';
import Link from 'next/link';
import { useAccountingSettings } from '@/lib/api/accounting/settings';
import { useChartOfAccounts } from '@/lib/api/accounting/chart-of-accounts';
import { useAllJournalEntries } from '@/lib/api/accounting/journal-entries';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { AccountingActivationCard } from '@/components/contabilidad/accounting-activation-card';
import { AccountingSettingsForm } from '@/components/contabilidad/accounting-settings-form';
import { PaymentMethodMappingsTable } from '@/components/contabilidad/payment-method-mappings-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** Vista general + activación + configuración contable (F8 §5.1). */
export default function ConfiguracionContablePage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const settings = useAccountingSettings(companyId);
  const { membership, isLoading: membershipLoading } = useCurrentMembership(companyId);
  const canManage =
    !membershipLoading && membership
      ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName)
      : false;

  const accountingActive = settings.isSuccess;
  const accounts = useChartOfAccounts(companyId, true);
  const entries = useAllJournalEntries(companyId);

  if (settings.isLoading || membershipLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (!accountingActive) {
    return <AccountingActivationCard companyId={companyId} canManage={canManage} />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cuentas activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/${companyId}/contabilidad/plan-de-cuentas`}
              className="text-2xl font-semibold hover:underline"
            >
              {accounts.isLoading ? '…' : accounts.data?.length ?? 0}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Asientos</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/${companyId}/contabilidad/asientos`}
              className="text-2xl font-semibold hover:underline"
            >
              {entries.isLoading ? '…' : entries.data?.length ?? 0}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Libro Mayor</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/${companyId}/contabilidad/libro-mayor`}
              className="text-sm font-medium hover:underline"
            >
              Consultar cuenta →
            </Link>
          </CardContent>
        </Card>
      </div>

      {settings.data && (
        <AccountingSettingsForm
          companyId={companyId}
          settings={settings.data}
          canManage={canManage}
        />
      )}

      <PaymentMethodMappingsTable companyId={companyId} canManage={canManage} />
    </div>
  );
}
