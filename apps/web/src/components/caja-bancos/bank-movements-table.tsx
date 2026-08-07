'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { type BankMovement, type BankMovementType } from '@/lib/api/treasury/cash-bank';
import { formatMoney } from '@/lib/utils';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const TYPE_LABELS: Record<BankMovementType, string> = { DEPOSIT: 'Depósito', WITHDRAWAL: 'Extracción' };

/**
 * Movimientos de una cuenta bancaria (F7 §5.5) — manuales y automáticos
 * (desde Tesorería, F6) mezclados. Filtros client-side: el `GET` no
 * admite ninguno (10-sprint-f7-caja-bancos.md §2.3). "Conciliación"
 * queda siempre "Pendiente" — no existe caso de uso de backend para
 * cambiarlo (§3.5).
 */
export function BankMovementsTable({
  companyId,
  movements,
}: {
  companyId: string;
  movements: BankMovement[];
}) {
  const [type, setType] = useState<BankMovementType | 'all'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filtered = movements.filter((m) => {
    if (type !== 'all' && m.type !== type) return false;
    const day = m.date.slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  });

  const columns: ColumnDef<BankMovement, any>[] = [
    {
      accessorKey: 'date',
      header: 'Fecha',
      cell: ({ row }) => new Date(row.original.date).toLocaleDateString('es-AR'),
    },
    {
      id: 'type',
      header: 'Tipo',
      cell: ({ row }) => (
        <StatusBadge
          label={TYPE_LABELS[row.original.type]}
          tone={row.original.type === 'DEPOSIT' ? 'active' : 'warning'}
        />
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Monto',
      cell: ({ row }) => <span className="font-mono">{formatMoney(row.original.amount)}</span>,
    },
    {
      id: 'origin',
      header: 'Origen',
      cell: ({ row }) =>
        row.original.paymentId ? (
          <Link
            href={`/${companyId}/tesoreria/cobros-pagos/${row.original.paymentId}`}
            className="hover:underline"
          >
            Cobro/pago {row.original.paymentId.slice(0, 8)}
          </Link>
        ) : (
          (row.original.description ?? '—')
        ),
    },
    {
      id: 'reconciled',
      header: 'Conciliación',
      cell: ({ row }) =>
        row.original.isReconciled ? (
          <StatusBadge label="Conciliado" tone="active" />
        ) : (
          <StatusBadge label="Pendiente" tone="neutral" />
        ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">Tipo</span>
          <Select value={type} onValueChange={(v) => v && setType(v as BankMovementType | 'all')}>
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="DEPOSIT">Depósito</SelectItem>
              <SelectItem value="WITHDRAWAL">Extracción</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">Desde</span>
          <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">Hasta</span>
          <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(m) => m.id}
        searchPlaceholder="Buscar movimiento..."
        emptyMessage="Todavía no hay movimientos en esta cuenta."
        renderMobileCard={(movement) => (
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{TYPE_LABELS[movement.type]}</p>
              <p className="text-sm text-muted-foreground">
                {movement.paymentId
                  ? `Cobro/pago ${movement.paymentId.slice(0, 8)}`
                  : (movement.description ?? '—')}
              </p>
            </div>
            <p className="font-mono text-sm">{formatMoney(movement.amount)}</p>
          </div>
        )}
      />
    </div>
  );
}
