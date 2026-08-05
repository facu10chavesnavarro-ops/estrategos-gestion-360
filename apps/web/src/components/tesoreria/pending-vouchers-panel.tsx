'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePendingVouchers } from '@/lib/api/treasury/pending-vouchers';
import type { VoucherFlow } from '@/lib/api/vouchers/voucher-types';
import { formatMoney } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * Extiende el detalle de Cliente/Proveedor (F2) con los comprobantes
 * pendientes de esa contraparte (F6 §3.7 del doc de arquitectura) —
 * misma decisión de "embebido en el detalle, no un módulo aparte" que
 * ya tomó F2 para la cuenta corriente.
 */
export function PendingVouchersPanel({
  companyId,
  partyId,
  flow,
  paymentTermDays,
  canManage,
}: {
  companyId: string;
  partyId: string;
  flow: VoucherFlow;
  paymentTermDays: number | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const { rows, isLoading } = usePendingVouchers(companyId, partyId, flow, paymentTermDays);
  const actionHref =
    flow === 'SALE'
      ? `/${companyId}/tesoreria/nuevo/cobro?partyId=${partyId}`
      : `/${companyId}/tesoreria/nuevo/pago?partyId=${partyId}`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Comprobantes pendientes</CardTitle>
        {canManage && rows.length > 0 && (
          <Button size="sm" onClick={() => router.push(actionHref)}>
            {flow === 'SALE' ? 'Registrar cobro' : 'Registrar pago'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay comprobantes pendientes.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comprobante</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Pendiente</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.voucherId}>
                    <TableCell>
                      <Link href={`/${companyId}/comprobantes/${row.voucherId}`} className="hover:underline">
                        {row.voucherTypeCode} N.º {row.number}
                      </Link>
                    </TableCell>
                    <TableCell>{new Date(row.issueDate).toLocaleDateString('es-AR')}</TableCell>
                    <TableCell className="font-mono">{formatMoney(row.pendingAmount)}</TableCell>
                    <TableCell>
                      {row.isOverdue && <Badge variant="destructive">Vencido</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
