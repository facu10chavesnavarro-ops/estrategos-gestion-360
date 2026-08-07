'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  type BankAccountWithBalance,
  useActivateBankAccount,
  useDeactivateBankAccount,
} from '@/lib/api/treasury/cash-bank';
import { ApiError } from '@/lib/api/http-client';
import { formatMoney } from '@/lib/utils';
import { DataTable } from '@/components/shared/data-table';
import { ActiveStatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';

type ConfirmTarget = { bankAccount: BankAccountWithBalance; action: 'activate' | 'deactivate' };

/** Listado de cuentas bancarias (F7 §5.4). */
export function BankAccountsTable({
  companyId,
  bankAccounts,
  canManage,
  onEdit,
  toolbar,
}: {
  companyId: string;
  bankAccounts: BankAccountWithBalance[];
  canManage: boolean;
  onEdit: (bankAccount: BankAccountWithBalance) => void;
  toolbar?: React.ReactNode;
}) {
  const activateBankAccount = useActivateBankAccount(companyId);
  const deactivateBankAccount = useDeactivateBankAccount(companyId);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);

  async function handleConfirm() {
    if (!confirmTarget) return;
    try {
      const { id: bankAccountId } = confirmTarget.bankAccount;
      if (confirmTarget.action === 'deactivate') {
        await deactivateBankAccount.mutateAsync({ bankAccountId });
        toast.success('Cuenta desactivada');
      } else {
        await activateBankAccount.mutateAsync({ bankAccountId });
        toast.success('Cuenta activada');
      }
      setConfirmTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo completar la acción');
    }
  }

  const columns: ColumnDef<BankAccountWithBalance, any>[] = [
    {
      accessorKey: 'bankName',
      header: 'Banco',
      cell: ({ row }) => (
        <Link
          href={`/${companyId}/caja-bancos/bancos/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.bankName}
          {row.original.alias ? ` — ${row.original.alias}` : ''}
        </Link>
      ),
    },
    {
      id: 'accountNumber',
      header: 'CBU / N.º de cuenta',
      cell: ({ row }) => row.original.cbu ?? row.original.accountNumber ?? '—',
    },
    { accessorKey: 'currency', header: 'Moneda' },
    {
      id: 'balance',
      header: 'Saldo',
      cell: ({ row }) => <span className="font-mono">{formatMoney(row.original.balance)}</span>,
    },
    {
      id: 'status',
      header: 'Estado',
      cell: ({ row }) => <ActiveStatusBadge isActive={row.original.isActive} />,
    },
    ...(canManage
      ? [
          {
            id: 'actions',
            header: '',
            cell: ({ row }: { row: { original: BankAccountWithBalance } }) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setConfirmTarget({
                      bankAccount: row.original,
                      action: row.original.isActive ? 'deactivate' : 'activate',
                    })
                  }
                >
                  {row.original.isActive ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            ),
          } as ColumnDef<BankAccountWithBalance, any>,
        ]
      : []),
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={bankAccounts}
        getRowId={(a) => a.id}
        searchPlaceholder="Buscar cuenta..."
        toolbar={toolbar}
        emptyMessage="Todavía no hay cuentas bancarias."
        renderMobileCard={(bankAccount) => (
          <Link
            href={`/${companyId}/caja-bancos/bancos/${bankAccount.id}`}
            className="flex items-start justify-between gap-2"
          >
            <div>
              <p className="font-medium">{bankAccount.bankName}</p>
              <p className="text-sm text-muted-foreground">{bankAccount.alias ?? bankAccount.cbu ?? '—'}</p>
            </div>
            <p className="font-mono text-sm">{formatMoney(bankAccount.balance)}</p>
          </Link>
        )}
      />

      {confirmTarget && (
        <ConfirmDialog
          open={Boolean(confirmTarget)}
          onOpenChange={(open) => !open && setConfirmTarget(null)}
          title={confirmTarget.action === 'deactivate' ? 'Desactivar cuenta' : 'Activar cuenta'}
          description={`¿Confirmás ${confirmTarget.action === 'deactivate' ? 'desactivar' : 'activar'} "${confirmTarget.bankAccount.bankName}"?`}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}
