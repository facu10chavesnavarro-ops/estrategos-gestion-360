'use client';

import { useFormContext, useFieldArray } from 'react-hook-form';
import Link from 'next/link';
import type { PendingVoucherRow } from '@/lib/api/treasury/pending-vouchers';
import { formatMoney } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { PaymentFormValues } from './payment-form';

/**
 * Selector de comprobantes pendientes con imputación total/parcial
 * (F6 §5.4). Cada fila marcada agrega una entrada a `allocations` del
 * formulario, prellenada con el saldo pendiente completo — el usuario
 * puede editarla hacia abajo para una imputación parcial.
 */
export function PendingVouchersPicker({
  companyId,
  rows,
  isLoading,
}: {
  companyId: string;
  rows: PendingVoucherRow[];
  isLoading: boolean;
}) {
  const { control, register } = useFormContext<PaymentFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'allocations' });

  function toggle(row: PendingVoucherRow) {
    const idx = fields.findIndex((f) => f.voucherId === row.voucherId);
    if (idx >= 0) {
      remove(idx);
    } else {
      append({ voucherId: row.voucherId, amountApplied: row.pendingAmount });
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando comprobantes pendientes…</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta contraparte no tiene comprobantes pendientes. Podés registrar igual un cobro/pago a
        cuenta, sin imputar a ningún comprobante.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Comprobante</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Pendiente</TableHead>
            <TableHead>A imputar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const idx = fields.findIndex((f) => f.voucherId === row.voucherId);
            const checked = idx >= 0;
            return (
              <TableRow key={row.voucherId}>
                <TableCell>
                  <Checkbox checked={checked} onCheckedChange={() => toggle(row)} />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/${companyId}/comprobantes/${row.voucherId}`}
                    className="hover:underline"
                    target="_blank"
                  >
                    {row.voucherTypeCode} N.º {row.number}
                  </Link>
                  {row.isOverdue && (
                    <Badge variant="destructive" className="ml-2">
                      Vencido
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{new Date(row.issueDate).toLocaleDateString('es-AR')}</TableCell>
                <TableCell className="font-mono">{formatMoney(row.pendingAmount)}</TableCell>
                <TableCell>
                  {checked && (
                    <Input
                      inputMode="decimal"
                      className="w-28"
                      {...register(`allocations.${idx}.amountApplied` as const)}
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
