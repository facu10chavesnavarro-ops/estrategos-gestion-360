'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { type AccountLedgerMovement } from '@/lib/api/accounting/chart-of-accounts';
import { DataTable } from '@/components/shared/data-table';
import { formatMoney } from '@/lib/utils';

/**
 * Libro Mayor de una cuenta (F8 §5.3/§5.4). `runningBalance` viene
 * calculado por el backend (§2.2, docs/frontend/11-sprint-f8-contabilidad.md)
 * con la convención contable correcta según el tipo de cuenta — se
 * renderiza tal cual, sin ningún cálculo en el cliente.
 */
export function AccountLedgerTable({
  companyId,
  movements,
}: {
  companyId: string;
  movements: AccountLedgerMovement[];
}) {
  const columns: ColumnDef<AccountLedgerMovement, any>[] = [
    {
      accessorKey: 'date',
      header: 'Fecha',
      cell: ({ row }) => new Date(row.original.date).toLocaleDateString('es-AR'),
    },
    {
      id: 'journalEntryId',
      header: 'Asiento',
      cell: ({ row }) => (
        <Link
          href={`/${companyId}/contabilidad/asientos/${row.original.journalEntryId}`}
          className="font-mono text-xs hover:underline"
        >
          {row.original.journalEntryId.slice(0, 8)}
        </Link>
      ),
    },
    { accessorKey: 'description', header: 'Descripción' },
    {
      accessorKey: 'debit',
      header: 'Débito',
      cell: ({ row }) =>
        Number(row.original.debit) > 0 ? (
          <span className="font-mono">{formatMoney(row.original.debit)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: 'credit',
      header: 'Crédito',
      cell: ({ row }) =>
        Number(row.original.credit) > 0 ? (
          <span className="font-mono">{formatMoney(row.original.credit)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: 'runningBalance',
      header: 'Saldo',
      cell: ({ row }) => <span className="font-mono font-medium">{formatMoney(row.original.runningBalance)}</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={movements}
      getRowId={(m) => `${m.journalEntryId}-${m.date}-${m.debit}-${m.credit}`}
      searchPlaceholder="Buscar en el Libro Mayor..."
      emptyMessage="Esta cuenta todavía no tiene movimientos."
      renderMobileCard={(m) => (
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm">{m.description}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(m.date).toLocaleDateString('es-AR')}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm">
              {Number(m.debit) > 0 ? `+${formatMoney(m.debit)}` : `-${formatMoney(m.credit)}`}
            </p>
            <p className="font-mono text-xs text-muted-foreground">{formatMoney(m.runningBalance)}</p>
          </div>
        </div>
      )}
    />
  );
}
