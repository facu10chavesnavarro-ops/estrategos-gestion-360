'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { type CashSession, isCashSessionOpen } from '@/lib/api/treasury/cash-bank';
import { formatMoney } from '@/lib/utils';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';

/** Historial de sesiones de una caja (F7 §5.2). */
export function CashSessionsTable({
  companyId,
  cashRegisterId,
  sessions,
}: {
  companyId: string;
  cashRegisterId: string;
  sessions: CashSession[];
}) {
  const columns: ColumnDef<CashSession, any>[] = [
    {
      accessorKey: 'openedAt',
      header: 'Apertura',
      cell: ({ row }) => (
        <Link
          href={`/${companyId}/caja-bancos/caja/${cashRegisterId}/sesiones/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {new Date(row.original.openedAt).toLocaleString('es-AR')}
        </Link>
      ),
    },
    {
      id: 'closedAt',
      header: 'Cierre',
      cell: ({ row }) =>
        row.original.closedAt ? new Date(row.original.closedAt).toLocaleString('es-AR') : '—',
    },
    {
      accessorKey: 'openingBalance',
      header: 'Saldo inicial',
      cell: ({ row }) => <span className="font-mono">{formatMoney(row.original.openingBalance)}</span>,
    },
    {
      id: 'expectedBalance',
      header: 'Esperado',
      cell: ({ row }) =>
        row.original.expectedBalance ? (
          <span className="font-mono">{formatMoney(row.original.expectedBalance)}</span>
        ) : (
          '—'
        ),
    },
    {
      id: 'closingBalance',
      header: 'Contado',
      cell: ({ row }) =>
        row.original.closingBalance ? (
          <span className="font-mono">{formatMoney(row.original.closingBalance)}</span>
        ) : (
          '—'
        ),
    },
    {
      id: 'difference',
      header: 'Diferencia',
      cell: ({ row }) => {
        if (row.original.difference === null) return '—';
        const diff = Number(row.original.difference);
        return (
          <span className={diff === 0 ? 'font-mono' : 'font-mono font-semibold text-destructive'}>
            {formatMoney(row.original.difference)}
          </span>
        );
      },
    },
    {
      id: 'status',
      header: 'Estado',
      cell: ({ row }) =>
        isCashSessionOpen(row.original) ? (
          <StatusBadge label="Abierta" tone="active" />
        ) : (
          <StatusBadge label="Cerrada" tone="neutral" />
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={sessions}
      getRowId={(s) => s.id}
      searchPlaceholder="Buscar sesión..."
      emptyMessage="Todavía no se abrió ninguna sesión en esta caja."
      renderMobileCard={(session) => (
        <Link
          href={`/${companyId}/caja-bancos/caja/${cashRegisterId}/sesiones/${session.id}`}
          className="flex items-start justify-between gap-2"
        >
          <div>
            <p className="font-medium">{new Date(session.openedAt).toLocaleDateString('es-AR')}</p>
            <p className="text-sm text-muted-foreground">
              Inicial: {formatMoney(session.openingBalance)}
            </p>
          </div>
          {isCashSessionOpen(session) ? (
            <StatusBadge label="Abierta" tone="active" />
          ) : (
            <StatusBadge label="Cerrada" tone="neutral" />
          )}
        </Link>
      )}
    />
  );
}
