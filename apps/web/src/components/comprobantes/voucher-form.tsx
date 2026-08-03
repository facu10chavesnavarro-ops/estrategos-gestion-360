'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { type VoucherFlow, useVoucherTypes } from '@/lib/api/vouchers/voucher-types';
import { useAllPointsOfSale } from '@/lib/api/vouchers/point-of-sale';
import { useAllWarehouses } from '@/lib/api/inventory/warehouses';
import { useCustomers } from '@/lib/api/customers';
import { useSuppliers } from '@/lib/api/suppliers';
import { useItems } from '@/lib/api/catalog/items';
import { useTaxes } from '@/lib/api/catalog/taxes';
import { useCreateVoucher, useVouchers } from '@/lib/api/vouchers/vouchers';
import { ApiError } from '@/lib/api/http-client';
import { formatMoney } from '@/lib/utils';
import { VoucherLineRow } from './voucher-line-row';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const lineSchema = z.object({
  itemId: z.string().min(1, 'Elegí un ítem'),
  description: z.string().min(1, 'La descripción es obligatoria'),
  quantity: z
    .string()
    .min(1, 'La cantidad es obligatoria')
    .refine((v) => Number(v) > 0, 'Debe ser mayor a cero'),
  unitPrice: z
    .string()
    .min(1, 'El precio es obligatorio')
    .refine((v) => Number(v) >= 0, 'No puede ser negativo'),
  discountPercentage: z.string().optional(),
});

const voucherFormSchema = z.object({
  voucherTypeId: z.string().min(1, 'Elegí un tipo de comprobante'),
  partyId: z.string().min(1, 'Elegí una contraparte'),
  pointOfSaleId: z.string().min(1, 'Elegí un punto de venta'),
  relatedVoucherId: z.string().optional(),
  warehouseId: z.string().optional(),
  lines: z.array(lineSchema).min(1, 'Agregá al menos una línea'),
});

export type VoucherFormValues = z.infer<typeof voucherFormSchema>;

const EMPTY_LINE = { itemId: '', description: '', quantity: '1', unitPrice: '', discountPercentage: '0' };

/**
 * Alta de comprobante — Factura de Venta/Compra o Nota de Crédito (F5
 * §5.4/§5.5). Un mismo formulario para los tres casos: `flow` filtra el
 * tipo de comprobante y la contraparte (cliente vs. proveedor); si el
 * tipo elegido es Nota de Crédito, aparece el selector de "comprobante a
 * corregir" (§3.6 del doc de arquitectura).
 */
export function VoucherForm({
  companyId,
  flow,
  defaultPartyId,
  defaultRelatedVoucherId,
}: {
  companyId: string;
  flow: VoucherFlow;
  defaultPartyId?: string;
  defaultRelatedVoucherId?: string;
}) {
  const router = useRouter();
  const voucherTypes = useVoucherTypes();
  const { pointsOfSale } = useAllPointsOfSale(companyId);
  const activePointsOfSale = pointsOfSale.filter((p) => p.isActive);
  const { warehouses } = useAllWarehouses(companyId);
  const activeWarehouses = warehouses.filter((w) => w.isActive);
  const customers = useCustomers(companyId, { isActive: true });
  const suppliers = useSuppliers(companyId, { isActive: true });
  const items = useItems(companyId, { isActive: true });
  const taxes = useTaxes(companyId, true);
  const createVoucher = useCreateVoucher(companyId);

  const flowTypes = (voucherTypes.data ?? []).filter((t) => t.flow === flow && t.isActive);
  const parties =
    flow === 'SALE'
      ? (customers.data ?? []).map((c) => ({ partyId: c.partyId, label: c.legalName }))
      : (suppliers.data ?? []).map((s) => ({ partyId: s.partyId, label: s.legalName }));
  const partyLabel = flow === 'SALE' ? 'Cliente' : 'Proveedor';

  const form = useForm<VoucherFormValues>({
    resolver: zodResolver(voucherFormSchema),
    defaultValues: {
      voucherTypeId: '',
      partyId: defaultPartyId ?? '',
      pointOfSaleId: '',
      relatedVoucherId: defaultRelatedVoucherId ?? '',
      warehouseId: '',
      lines: [EMPTY_LINE],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'lines' });

  const voucherTypeId = form.watch('voucherTypeId');
  const partyId = form.watch('partyId');
  const watchedLines = form.watch('lines');
  const selectedType = flowTypes.find((t) => t.id === voucherTypeId);

  // Compra tiene un único tipo activo (FC) — se preselecciona solo, sin
  // pedirle al usuario que elija entre una sola opción.
  useEffect(() => {
    if (flow === 'PURCHASE' && flowTypes.length === 1 && !form.getValues('voucherTypeId')) {
      form.setValue('voucherTypeId', flowTypes[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow, flowTypes.length]);

  // Si se llega desde "Emitir Nota de Crédito" (detalle de comprobante),
  // preselecciona el primer tipo de Nota de Crédito disponible — el
  // usuario puede cambiarlo si corresponde otra letra.
  useEffect(() => {
    if (defaultRelatedVoucherId && !form.getValues('voucherTypeId')) {
      const creditNoteType = flowTypes.find((t) => t.isCreditNote);
      if (creditNoteType) form.setValue('voucherTypeId', creditNoteType.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultRelatedVoucherId, flowTypes.length]);

  const relatedCandidates = useVouchers(
    companyId,
    { partyId },
    { enabled: Boolean(selectedType?.isCreditNote) && Boolean(partyId) },
  );
  const relatedOptions = (relatedCandidates.data ?? []).filter((v) => {
    const type = (voucherTypes.data ?? []).find((t) => t.id === v.voucherTypeId);
    return type && !type.isCreditNote;
  });

  const itemById = useMemo(() => new Map((items.data ?? []).map((i) => [i.id, i])), [items.data]);
  const taxById = useMemo(() => new Map((taxes.data ?? []).map((t) => [t.id, t])), [taxes.data]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;
    for (const line of watchedLines ?? []) {
      const qty = Number(line.quantity) || 0;
      const price = Number(line.unitPrice) || 0;
      const discount = Number(line.discountPercentage) || 0;
      const lineSubtotal = qty * price * (1 - discount / 100);
      subtotal += lineSubtotal;
      const item = itemById.get(line.itemId);
      for (const taxId of item?.taxIds ?? []) {
        const tax = taxById.get(taxId);
        if (tax) taxTotal += lineSubtotal * (Number(tax.rate) / 100);
      }
    }
    return { subtotal, taxTotal, total: subtotal + taxTotal };
  }, [watchedLines, itemById, taxById]);

  const hasStockAffectingLine = (watchedLines ?? []).some((l) => itemById.get(l.itemId)?.tracksStock);
  const requiresWarehouse = Boolean(selectedType && selectedType.affectsStock !== 'NONE' && hasStockAffectingLine);

  async function onSubmit(values: VoucherFormValues) {
    if (selectedType?.relatedVoucherRequired && !values.relatedVoucherId) {
      form.setError('relatedVoucherId', { message: 'Elegí el comprobante a corregir' });
      return;
    }
    if (requiresWarehouse && !values.warehouseId) {
      form.setError('warehouseId', {
        message: 'Elegí un depósito: hay líneas que controlan stock',
      });
      return;
    }
    const pointOfSale = activePointsOfSale.find((p) => p.id === values.pointOfSaleId);
    if (!pointOfSale) {
      form.setError('pointOfSaleId', { message: 'Elegí un punto de venta' });
      return;
    }

    try {
      const created = await createVoucher.mutateAsync({
        branchId: pointOfSale.branchId,
        pointOfSaleId: values.pointOfSaleId,
        voucherTypeId: values.voucherTypeId,
        partyId: values.partyId,
        warehouseId: values.warehouseId || undefined,
        relatedVoucherId: values.relatedVoucherId || undefined,
        lines: values.lines.map((line) => ({
          itemId: line.itemId,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountPercentage: line.discountPercentage || undefined,
        })),
      });
      toast.success('Comprobante creado');
      router.push(`/${companyId}/comprobantes/${created.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo crear el comprobante');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Datos del comprobante</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {flowTypes.length > 1 && (
              <FormField
                control={form.control}
                name="voucherTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de comprobante</FormLabel>
                    <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Elegí un tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {flowTypes.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="partyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{partyLabel}</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={`Elegí un ${partyLabel.toLowerCase()}`} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {parties.map((p) => (
                        <SelectItem key={p.partyId} value={p.partyId}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedType?.isCreditNote && (
              <FormField
                control={form.control}
                name="relatedVoucherId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comprobante a corregir</FormLabel>
                    <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={partyId ? 'Elegí un comprobante' : 'Elegí primero un cliente'}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {relatedOptions.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            N.º {v.number} — {formatMoney(v.total)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="pointOfSaleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Punto de venta</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Elegí un punto de venta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activePointsOfSale.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.code} — {p.name} ({p.branchName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {requiresWarehouse && (
              <FormField
                control={form.control}
                name="warehouseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Depósito</FormLabel>
                    <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Elegí un depósito" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeWarehouses.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name} ({w.branchName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Productos y servicios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ítem</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Descuento %</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <VoucherLineRow
                      key={field.id}
                      index={index}
                      items={items.data ?? []}
                      onRemove={() => remove(index)}
                      canRemove={fields.length > 1}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={() => append(EMPTY_LINE)}>
              + Agregar línea
            </Button>

            <div className="ml-auto max-w-xs space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal (estimado)</span>
                <span className="font-mono">{formatMoney(totals.subtotal.toFixed(2))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Impuestos (estimado)</span>
                <span className="font-mono">{formatMoney(totals.taxTotal.toFixed(2))}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total (estimado)</span>
                <span className="font-mono">{formatMoney(totals.total.toFixed(2))}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                El total definitivo lo confirma el sistema al guardar.
              </p>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Guardando…' : 'Confirmar comprobante'}
        </Button>
      </form>
    </Form>
  );
}
