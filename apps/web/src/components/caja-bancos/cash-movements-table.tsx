'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { type CashMovement, type CashMovementType } from '@/lib/api/treasury/cash-bank';
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

const TYPE_LABELS: Record<CashMovementType, string> = { IN: 'Ingreso', OUT: 'Egreso' };

/**
 * Movimientos de una sesión de caja (F7 §5.3) — manuales y automáticos
 * (desde Tesorería, F6) mezclados, distinguibles por `paymentId`. Filtros
 * client-side por tipo y fecha: el `GET` no admite ninguno (ver
 * 10-sprint-f7-caja-bancos.md §2.3).
 */
export function CashMovementsTable({
  companyId,
  movements,
}: {
  companyId: string;
  movements: CashMovement[];
}) {
  const [type, setType] = useState<CashMovementType | 'all'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filtered = movements.filter((m) => {
    if (type !== 'all' && m.type !== type) return false;
    const day = m.createdAt.slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  });

  const columns: ColumnDef<CashMovement, any>[] = [
    {
      accessorKey: 'createdAt',
      header: 'Fecha',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString('es-AR'),
    },
    {
      id: 'type',
      header: 'Tipo',
      cell: ({ row }) => (
        <StatusBadge
          label={TYPE_LABELS[row.original.type]}
          tone={row.original.type === 'IN' ? 'active' : 'warning'}
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
          (row.original.reason ?? '—')
        ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">Tipo</span>
          <Select value={type} onValueChange={(v) => v && setType(v as CashMovementType | 'all')}>
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="IN">Ingreso</SelectItem>
              <SelectItem value="OUT">Egreso</SelectItem>
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
        emptyMessage="Todavía no hay movimientos en esta sesión."
        renderMobileCard={(movement) => (
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{TYPE_LABELS[movement.type]}</p>
              <p className="text-sm text-muted-foreground">
                {movement.paymentId ? `Cobro/pago ${movement.paymentId.slice(0, 8)}` : (movement.reason ?? '—')}
              </p>
            </div>
            <p className="font-mono text-sm">{formatMoney(movement.amount)}</p>
          </div>
        )}
      />
    </div>
  );
}
