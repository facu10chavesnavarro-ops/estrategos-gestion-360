'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import type { PaymentWithPartyName } from '@/lib/api/treasury/payments';
import { formatMoney } from '@/lib/utils';
import { DataTable } from '@/components/shared/data-table';
import { Badge } from '@/components/ui/badge';

const DIRECTION_LABEL: Record<'COLLECTION' | 'PAYMENT', string> = {
  COLLECTION: 'Cobro',
  PAYMENT: 'Pago',
};

/** Listado de cobros/pagos (F6 §5.2). */
export function PaymentsTable({
  companyId,
  rows,
  toolbar,
}: {
  companyId: string;
  rows: PaymentWithPartyName[];
  toolbar?: React.ReactNode;
}) {
  const columns: ColumnDef<PaymentWithPartyName, any>[] = [
    {
      id: 'direction',
      header: 'Tipo',
      cell: ({ row }) => (
        <Badge variant={row.original.direction === 'COLLECTION' ? 'default' : 'secondary'}>
          {DIRECTION_LABEL[row.original.direction]}
        </Badge>
      ),
    },
    {
      id: 'partyName',
      header: 'Cliente / Proveedor',
      cell: ({ row }) => (
        <Link href={`/${companyId}/tesoreria/cobros-pagos/${row.original.id}`} className="font-medium hover:underline">
          {row.original.partyName}
        </Link>
      ),
    },
    {
      id: 'date',
      header: 'Fecha',
      cell: ({ row }) => new Date(row.original.date).toLocaleDateString('es-AR'),
    },
    {
      id: 'total',
      header: 'Monto',
      cell: ({ row }) => <span className="font-mono">{formatMoney(row.original.totalAmount)}</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(p) => p.id}
      searchPlaceholder="Buscar por cliente o proveedor..."
      toolbar={toolbar}
      emptyMessage="Todavía no hay cobros ni pagos registrados."
      renderMobileCard={(payment) => (
        <Link
          href={`/${companyId}/tesoreria/cobros-pagos/${payment.id}`}
          className="flex items-start justify-between gap-2"
        >
          <div>
            <p className="font-medium">{payment.partyName}</p>
            <p className="text-sm text-muted-foreground">
              {DIRECTION_LABEL[payment.direction]} · {new Date(payment.date).toLocaleDateString('es-AR')}
            </p>
          </div>
          <p className="font-mono text-sm">{formatMoney(payment.totalAmount)}</p>
        </Link>
      )}
    />
  );
}
