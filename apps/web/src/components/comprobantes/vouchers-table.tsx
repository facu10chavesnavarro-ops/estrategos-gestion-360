'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import type { VoucherWithLabels } from '@/lib/api/vouchers/vouchers';
import { formatMoney } from '@/lib/utils';
import { DataTable } from '@/components/shared/data-table';
import { Badge } from '@/components/ui/badge';

/** Listado de comprobantes (F5 §5.2): número+letra, tipo, contraparte, fecha, total. */
export function VouchersTable({
  companyId,
  rows,
  toolbar,
}: {
  companyId: string;
  rows: VoucherWithLabels[];
  toolbar?: React.ReactNode;
}) {
  const columns: ColumnDef<VoucherWithLabels, any>[] = [
    {
      id: 'number',
      header: 'Comprobante',
      cell: ({ row }) => (
        <Link href={`/${companyId}/comprobantes/${row.original.id}`} className="font-medium hover:underline">
          {row.original.voucherType?.code ?? '—'} N.º {row.original.number}
        </Link>
      ),
    },
    {
      id: 'voucherType',
      header: 'Tipo',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span>{row.original.voucherType?.name ?? '—'}</span>
          {row.original.voucherType?.isCreditNote && <Badge variant="secondary">Nota de Crédito</Badge>}
        </div>
      ),
    },
    { accessorKey: 'partyName', header: 'Cliente / Proveedor' },
    {
      id: 'issueDate',
      header: 'Fecha',
      cell: ({ row }) => new Date(row.original.issueDate).toLocaleDateString('es-AR'),
    },
    {
      id: 'total',
      header: 'Total',
      cell: ({ row }) => <span className="font-mono">{formatMoney(row.original.total)}</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(v) => v.id}
      searchPlaceholder="Buscar por cliente o proveedor..."
      toolbar={toolbar}
      emptyMessage="Todavía no hay comprobantes emitidos."
      renderMobileCard={(voucher) => (
        <Link
          href={`/${companyId}/comprobantes/${voucher.id}`}
          className="flex items-start justify-between gap-2"
        >
          <div>
            <p className="font-medium">
              {voucher.voucherType?.code ?? '—'} N.º {voucher.number}
            </p>
            <p className="text-sm text-muted-foreground">{voucher.partyName}</p>
          </div>
          <p className="font-mono text-sm">{formatMoney(voucher.total)}</p>
        </Link>
      )}
    />
  );
}
