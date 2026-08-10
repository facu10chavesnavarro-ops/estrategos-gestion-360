'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { type JournalEntry, isJournalEntryReversed } from '@/lib/api/accounting/journal-entries';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatMoney } from '@/lib/utils';

const SOURCE_LABELS: Record<string, string> = {
  VOUCHER: 'Comprobante',
  PAYMENT: 'Cobro/Pago',
};

function totalDebit(entry: JournalEntry): string {
  const total = entry.lines.reduce((sum, l) => sum + Number(l.debit || '0'), 0);
  return total.toFixed(2);
}

/** Libro Diario: listado cronológico de asientos (F8 §5.4). */
export function JournalEntriesTable({
  companyId,
  entries,
  allEntries,
  toolbar,
}: {
  companyId: string;
  entries: JournalEntry[];
  /** Lista completa (sin filtro de fecha) — para derivar "¿ya fue revertido?" (§3.3). */
  allEntries: JournalEntry[];
  toolbar?: React.ReactNode;
}) {
  const columns: ColumnDef<JournalEntry, any>[] = [
    {
      accessorKey: 'date',
      header: 'Fecha',
      cell: ({ row }) => new Date(row.original.date).toLocaleDateString('es-AR'),
    },
    {
      accessorKey: 'description',
      header: 'Concepto',
      cell: ({ row }) => (
        <Link
          href={`/${companyId}/contabilidad/asientos/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.description}
        </Link>
      ),
    },
    {
      id: 'origin',
      header: 'Origen',
      cell: ({ row }) => {
        const entry = row.original;
        if (entry.sourceType) {
          return <StatusBadge label={SOURCE_LABELS[entry.sourceType] ?? entry.sourceType} tone="neutral" />;
        }
        return (
          <StatusBadge label={entry.origin === 'MANUAL' ? 'Manual' : 'Automático'} tone="neutral" />
        );
      },
    },
    {
      id: 'reversed',
      header: 'Estado',
      cell: ({ row }) =>
        row.original.reversalOfEntryId ? (
          <StatusBadge label="Es una reversión" tone="warning" />
        ) : isJournalEntryReversed(allEntries, row.original.id) ? (
          <StatusBadge label="Revertido" tone="warning" />
        ) : (
          <StatusBadge label="Vigente" tone="active" />
        ),
    },
    {
      id: 'total',
      header: 'Total',
      cell: ({ row }) => <span className="font-mono">{formatMoney(totalDebit(row.original))}</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={entries}
      getRowId={(e) => e.id}
      searchPlaceholder="Buscar asiento..."
      toolbar={toolbar}
      emptyMessage="No hay asientos en el rango seleccionado."
      renderMobileCard={(entry) => (
        <Link
          href={`/${companyId}/contabilidad/asientos/${entry.id}`}
          className="flex items-start justify-between gap-2"
        >
          <div>
            <p className="font-medium">{entry.description}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(entry.date).toLocaleDateString('es-AR')}
            </p>
          </div>
          <p className="font-mono text-sm">{formatMoney(totalDebit(entry))}</p>
        </Link>
      )}
    />
  );
}
