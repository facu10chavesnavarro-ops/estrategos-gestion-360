'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { usePayment } from '@/lib/api/treasury/payments';
import { usePaymentMethods } from '@/lib/api/treasury/payment-methods';
import { useCustomers } from '@/lib/api/customers';
import { useSuppliers } from '@/lib/api/suppliers';
import { useVouchers } from '@/lib/api/vouchers/vouchers';
import { useVoucherTypes } from '@/lib/api/vouchers/voucher-types';
import { useAllJournalEntries, findJournalEntryBySource } from '@/lib/api/accounting/journal-entries';
import { formatMoney } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const DIRECTION_LABEL: Record<'COLLECTION' | 'PAYMENT', string> = {
  COLLECTION: 'Cobro',
  PAYMENT: 'Pago',
};

export default function PaymentDetailPage({
  params,
}: {
  params: { companyId: string; paymentId: string };
}) {
  const payment = usePayment(params.companyId, params.paymentId);
  const paymentMethods = usePaymentMethods();
  const customers = useCustomers(params.companyId, {});
  const suppliers = useSuppliers(params.companyId, {});
  const partyId = payment.data?.partyId;
  const vouchers = useVouchers(
    params.companyId,
    { partyId },
    { enabled: Boolean(partyId) },
  );
  const voucherTypes = useVoucherTypes();
  const journalEntries = useAllJournalEntries(params.companyId);
  const journalEntry = findJournalEntryBySource(journalEntries.data ?? [], 'PAYMENT', params.paymentId);

  const isLoading =
    payment.isLoading ||
    paymentMethods.isLoading ||
    customers.isLoading ||
    suppliers.isLoading ||
    vouchers.isLoading ||
    voucherTypes.isLoading;

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (!payment.data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">Este cobro/pago no existe.</p>
        <Link href={`/${params.companyId}/tesoreria/cobros-pagos`} className="text-sm underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  const p = payment.data;
  const customer = (customers.data ?? []).find((c) => c.partyId === p.partyId);
  const supplier = (suppliers.data ?? []).find((s) => s.partyId === p.partyId);
  const partyHref = customer
    ? `/${params.companyId}/clientes/${customer.id}`
    : supplier
      ? `/${params.companyId}/proveedores/${supplier.id}`
      : undefined;
  const partyName = customer?.legalName ?? supplier?.legalName ?? p.partyId;

  const methodById = new Map((paymentMethods.data ?? []).map((m) => [m.id, m]));
  const voucherById = new Map((vouchers.data ?? []).map((v) => [v.id, v]));
  const typeById = new Map((voucherTypes.data ?? []).map((t) => [t.id, t]));

  return (
    <div className="space-y-4">
      <Link
        href={`/${params.companyId}/tesoreria/cobros-pagos`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Cobros y pagos
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">
          {DIRECTION_LABEL[p.direction]} a {partyHref ? (
            <Link href={partyHref} className="hover:underline">
              {partyName}
            </Link>
          ) : (
            partyName
          )}
        </h1>
        {journalEntry && (
          <Link
            href={`/${params.companyId}/contabilidad/asientos/${journalEntry.id}`}
            className="text-sm text-primary hover:underline"
          >
            Ver asiento contable →
          </Link>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {new Date(p.date).toLocaleDateString('es-AR')}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Medios de pago</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medio</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {p.methodDetails.map((detail) => (
                  <TableRow key={detail.id}>
                    <TableCell>{methodById.get(detail.paymentMethodId)?.name ?? '—'}</TableCell>
                    <TableCell className="font-mono">{formatMoney(detail.amount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {detail.checkDetail
                        ? `Cheque N.º ${detail.checkDetail.number} — ${detail.checkDetail.bankName} — vence ${new Date(detail.checkDetail.dueDate).toLocaleDateString('es-AR')}`
                        : detail.reference
                          ? detail.reference
                          : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-3 text-right text-base font-semibold">
            Total: <span className="font-mono">{formatMoney(p.totalAmount)}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comprobantes imputados</CardTitle>
        </CardHeader>
        <CardContent>
          {p.allocations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este {DIRECTION_LABEL[p.direction].toLowerCase()} no imputa ningún comprobante — quedó
              como saldo a favor en la cuenta corriente.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comprobante</TableHead>
                    <TableHead>Importe imputado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {p.allocations.map((allocation) => {
                    const voucher = voucherById.get(allocation.voucherId);
                    const voucherType = voucher ? typeById.get(voucher.voucherTypeId) : undefined;
                    return (
                      <TableRow key={allocation.voucherId}>
                        <TableCell>
                          <Link
                            href={`/${params.companyId}/comprobantes/${allocation.voucherId}`}
                            className="hover:underline"
                          >
                            {voucherType?.code ?? '—'} N.º {voucher?.number ?? '—'}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono">{formatMoney(allocation.amountApplied)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
