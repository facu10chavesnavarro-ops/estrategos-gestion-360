'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useVoucher } from '@/lib/api/vouchers/vouchers';
import { useVoucherTypes } from '@/lib/api/vouchers/voucher-types';
import { useAllPointsOfSale } from '@/lib/api/vouchers/point-of-sale';
import { useAllWarehouses } from '@/lib/api/inventory/warehouses';
import { useCustomers } from '@/lib/api/customers';
import { useSuppliers } from '@/lib/api/suppliers';
import { useItems } from '@/lib/api/catalog/items';
import { useTaxes } from '@/lib/api/catalog/taxes';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { useAllJournalEntries, findJournalEntryBySource } from '@/lib/api/accounting/journal-entries';
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

export default function VoucherDetailPage({
  params,
}: {
  params: { companyId: string; voucherId: string };
}) {
  const router = useRouter();
  const voucher = useVoucher(params.companyId, params.voucherId);
  const voucherTypes = useVoucherTypes();
  const { pointsOfSale } = useAllPointsOfSale(params.companyId);
  const { warehouses } = useAllWarehouses(params.companyId);
  const customers = useCustomers(params.companyId, {});
  const suppliers = useSuppliers(params.companyId, {});
  const items = useItems(params.companyId, {});
  const taxes = useTaxes(params.companyId);
  const { membership } = useCurrentMembership(params.companyId);
  const canManage = membership ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName) : false;
  const journalEntries = useAllJournalEntries(params.companyId);
  const journalEntry = findJournalEntryBySource(journalEntries.data ?? [], 'VOUCHER', params.voucherId);

  const isLoading =
    voucher.isLoading ||
    voucherTypes.isLoading ||
    customers.isLoading ||
    suppliers.isLoading ||
    items.isLoading ||
    taxes.isLoading;

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (!voucher.data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">Este comprobante no existe.</p>
        <Link href={`/${params.companyId}/comprobantes`} className="text-sm underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  const v = voucher.data;
  const voucherType = (voucherTypes.data ?? []).find((t) => t.id === v.voucherTypeId);
  const customer = (customers.data ?? []).find((c) => c.partyId === v.partyId);
  const supplier = (suppliers.data ?? []).find((s) => s.partyId === v.partyId);
  const pointOfSale = pointsOfSale.find((p) => p.id === v.pointOfSaleId);
  const warehouse = warehouses.find((w) => w.id === v.warehouseId);
  const itemById = new Map((items.data ?? []).map((i) => [i.id, i]));
  const taxById = new Map((taxes.data ?? []).map((t) => [t.id, t]));

  const partyHref = customer
    ? `/${params.companyId}/clientes/${customer.id}`
    : supplier
      ? `/${params.companyId}/proveedores/${supplier.id}`
      : undefined;
  const partyName = customer?.legalName ?? supplier?.legalName ?? v.partyId;

  const canIssueCreditNote = voucherType?.flow === 'SALE' && !voucherType?.isCreditNote;

  return (
    <div className="space-y-4">
      <Link
        href={`/${params.companyId}/comprobantes`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Comprobantes
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">
            {voucherType?.code ?? '—'} N.º {v.number}
          </h1>
          {voucherType?.isCreditNote && <Badge variant="secondary">Nota de Crédito</Badge>}
          {journalEntry && (
            <Link
              href={`/${params.companyId}/contabilidad/asientos/${journalEntry.id}`}
              className="text-sm text-primary hover:underline"
            >
              Ver asiento contable →
            </Link>
          )}
        </div>
        {canManage && canIssueCreditNote && (
          <Button
            variant="outline"
            onClick={() =>
              router.push(
                `/${params.companyId}/comprobantes/nuevo/venta?relatedVoucherId=${v.id}&partyId=${v.partyId}`,
              )
            }
          >
            Emitir Nota de Crédito
          </Button>
        )}
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex justify-between sm:justify-start sm:gap-2">
          <dt className="text-muted-foreground">Cliente / Proveedor</dt>
          <dd>
            {partyHref ? (
              <Link href={partyHref} className="hover:underline">
                {partyName}
              </Link>
            ) : (
              partyName
            )}
          </dd>
        </div>
        <div className="flex justify-between sm:justify-start sm:gap-2">
          <dt className="text-muted-foreground">Fecha</dt>
          <dd>{new Date(v.issueDate).toLocaleDateString('es-AR')}</dd>
        </div>
        <div className="flex justify-between sm:justify-start sm:gap-2">
          <dt className="text-muted-foreground">Punto de venta</dt>
          <dd>{pointOfSale ? `${pointOfSale.code} — ${pointOfSale.name}` : '—'}</dd>
        </div>
        <div className="flex justify-between sm:justify-start sm:gap-2">
          <dt className="text-muted-foreground">Depósito</dt>
          <dd>
            {warehouse ? (
              <Link
                href={`/${params.companyId}/stock/depositos/${warehouse.id}`}
                className="hover:underline"
              >
                {warehouse.name}
              </Link>
            ) : (
              '—'
            )}
          </dd>
        </div>
      </dl>

      <Card>
        <CardHeader>
          <CardTitle>Líneas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ítem</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Descuento</TableHead>
                  <TableHead>Impuestos</TableHead>
                  <TableHead>Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {v.lines.map((line) => {
                  const item = line.itemId ? itemById.get(line.itemId) : undefined;
                  return (
                    <TableRow key={line.id}>
                      <TableCell>
                        {item ? (
                          <Link
                            href={`/${params.companyId}/catalogo/${item.type === 'PRODUCT' ? 'productos' : 'servicios'}/${item.id}`}
                            className="hover:underline"
                          >
                            {item.name}
                          </Link>
                        ) : (
                          line.description
                        )}
                      </TableCell>
                      <TableCell className="font-mono">{line.quantity}</TableCell>
                      <TableCell className="font-mono">{formatMoney(line.unitPrice)}</TableCell>
                      <TableCell className="font-mono">{line.discountPercentage}%</TableCell>
                      <TableCell>
                        {line.taxes.length === 0
                          ? '—'
                          : line.taxes
                              .map((t) => `${taxById.get(t.taxId)?.name ?? 'Impuesto'} (${t.rate}%)`)
                              .join(', ')}
                      </TableCell>
                      <TableCell className="font-mono">{formatMoney(line.subtotal)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">{formatMoney(v.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Impuestos</span>
              <span className="font-mono">{formatMoney(v.taxTotal)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="font-mono">{formatMoney(v.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
