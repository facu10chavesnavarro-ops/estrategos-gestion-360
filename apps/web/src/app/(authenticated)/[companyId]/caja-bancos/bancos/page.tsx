'use client';

import { useState } from 'react';
import {
  useBankAccountsWithBalance,
  type BankAccountWithBalance,
} from '@/lib/api/treasury/cash-bank';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { formatMoney } from '@/lib/utils';
import { BankAccountsTable } from '@/components/caja-bancos/bank-accounts-table';
import { BankAccountSheet } from '@/components/caja-bancos/bank-account-sheet';
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

/** Vista general + listado de cuentas bancarias (F7 §5.4). */
export default function BancosPage({ params }: { params: { companyId: string } }) {
  const { accounts, isLoading } = useBankAccountsWithBalance(params.companyId);
  const { membership, isLoading: membershipLoading } = useCurrentMembership(params.companyId);
  const canManage =
    !membershipLoading && membership
      ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName)
      : false;

  const [status, setStatus] = useState<StatusFilter>('all');
  const [sheetTarget, setSheetTarget] = useState<{ open: boolean; bankAccount?: BankAccountWithBalance }>({
    open: false,
  });

  const totalBalance = accounts
    .filter((a) => a.isActive)
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const filtered = accounts.filter((a) => {
    if (status === 'active') return a.isActive;
    if (status === 'inactive') return !a.isActive;
    return true;
  });

  if (isLoading || membershipLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Saldo total en cuentas activas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-2xl font-semibold">{formatMoney(totalBalance.toFixed(2))}</p>
        </CardContent>
      </Card>

      <BankAccountsTable
        companyId={params.companyId}
        bankAccounts={filtered}
        canManage={canManage}
        onEdit={(bankAccount) => setSheetTarget({ open: true, bankAccount })}
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
              <Button onClick={() => setSheetTarget({ open: true, bankAccount: undefined })}>
                + Nueva cuenta
              </Button>
            )}
          </div>
        }
      />

      <BankAccountSheet
        companyId={params.companyId}
        open={sheetTarget.open}
        onOpenChange={(open) => setSheetTarget((s) => ({ ...s, open }))}
        bankAccount={sheetTarget.bankAccount}
      />
    </div>
  );
}
