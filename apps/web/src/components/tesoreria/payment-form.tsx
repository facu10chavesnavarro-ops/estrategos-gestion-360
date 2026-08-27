'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useCustomers } from '@/lib/api/customers';
import { useSuppliers } from '@/lib/api/suppliers';
import { usePaymentMethods } from '@/lib/api/treasury/payment-methods';
import { useOpenCashSessions, useBankAccounts } from '@/lib/api/treasury/cash-bank';
import { useCreatePayment, type PaymentDirection } from '@/lib/api/treasury/payments';
import { usePendingVouchers } from '@/lib/api/treasury/pending-vouchers';
import { ApiError } from '@/lib/api/http-client';
import { PendingVouchersPicker } from './pending-vouchers-picker';
import { PaymentMethodLineRow } from './payment-method-line-row';
import { PaymentSummary } from './payment-summary';
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

const methodDetailSchema = z.object({
  paymentMethodId: z.string().min(1, 'Elegí un medio de pago'),
  amount: z
    .string()
    .min(1, 'El importe es obligatorio')
    .refine((v) => Number(v) > 0, 'Debe ser mayor a cero'),
  reference: z.string().optional(),
  checkNumber: z.string().optional(),
  checkBankName: z.string().optional(),
  checkDueDate: z.string().optional(),
});

const allocationSchema = z.object({
  voucherId: z.string(),
  amountApplied: z
    .string()
    .min(1, 'El importe imputado es obligatorio')
    .refine((v) => Number(v) > 0, 'Debe ser mayor a cero'),
});

const paymentFormSchema = z.object({
  partyId: z.string().min(1, 'Elegí una contraparte'),
  methodDetails: z.array(methodDetailSchema).min(1, 'Agregá al menos un medio de pago'),
  allocations: z.array(allocationSchema),
  cashSessionId: z.string().optional(),
  bankAccountId: z.string().optional(),
});

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;

const EMPTY_METHOD_DETAIL = {
  paymentMethodId: '',
  amount: '',
  reference: '',
  checkNumber: '',
  checkBankName: '',
  checkDueDate: '',
};

/**
 * Alta de cobro/pago (F6 §5.4) — un mismo formulario para Cobro y Pago,
 * `direction` decide contraparte y verbo. Flujo guiado: contraparte →
 * comprobantes pendientes → medios de pago → resumen → confirmar.
 */
export function PaymentForm({
  companyId,
  direction,
  defaultPartyId,
}: {
  companyId: string;
  direction: PaymentDirection;
  defaultPartyId?: string;
}) {
  const router = useRouter();
  const paymentMethods = usePaymentMethods();
  const customers = useCustomers(companyId, { isActive: true });
  const suppliers = useSuppliers(companyId, { isActive: true });
  const { openSessions, isLoading: sessionsLoading } = useOpenCashSessions(companyId);
  const bankAccounts = useBankAccounts(companyId);
  const activeBankAccounts = (bankAccounts.data ?? []).filter((a) => a.isActive);
  const createPayment = useCreatePayment(companyId);

  // Una clave por intento de envío (RN-PAY-11 en el backend) — se genera
  // una sola vez al montar el formulario y se reutiliza en cualquier
  // reintento de ESE mismo intento, nunca en un envío nuevo.
  const idempotencyKeyRef = useRef<string | undefined>(undefined);
  if (!idempotencyKeyRef.current) {
    idempotencyKeyRef.current = crypto.randomUUID();
  }

  const parties =
    direction === 'COLLECTION'
      ? (customers.data ?? []).map((c) => ({
          partyId: c.partyId,
          label: c.legalName,
          paymentTermDays: c.paymentTermDays,
        }))
      : (suppliers.data ?? []).map((s) => ({
          partyId: s.partyId,
          label: s.legalName,
          paymentTermDays: s.paymentTermDays,
        }));
  const partyLabel = direction === 'COLLECTION' ? 'Cliente' : 'Proveedor';

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      partyId: defaultPartyId ?? '',
      methodDetails: [EMPTY_METHOD_DETAIL],
      allocations: [],
      cashSessionId: '',
      bankAccountId: '',
    },
  });

  const { fields: methodFields, append: appendMethod, remove: removeMethod } = useFieldArray({
    control: form.control,
    name: 'methodDetails',
  });

  const partyId = form.watch('partyId');
  const watchedMethods = form.watch('methodDetails');
  const watchedAllocations = form.watch('allocations');

  useEffect(() => {
    // Al cambiar de contraparte, cualquier imputación elegida para la
    // anterior deja de tener sentido.
    form.setValue('allocations', []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId]);

  const selectedParty = parties.find((p) => p.partyId === partyId);
  const { rows: pendingRows, isLoading: pendingLoading } = usePendingVouchers(
    companyId,
    partyId,
    direction === 'COLLECTION' ? 'SALE' : 'PURCHASE',
    selectedParty?.paymentTermDays ?? null,
  );

  const methodById = new Map((paymentMethods.data ?? []).map((m) => [m.id, m]));
  const hasCashLine = watchedMethods.some((l) => methodById.get(l.paymentMethodId)?.requiresCashMovement);
  const hasBankLine = watchedMethods.some((l) => methodById.get(l.paymentMethodId)?.requiresBankMovement);

  const totalMethods = watchedMethods.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const totalAllocated = watchedAllocations.reduce((sum, a) => sum + (Number(a.amountApplied) || 0), 0);
  const totalSelected = watchedAllocations.reduce((sum, a) => {
    const row = pendingRows.find((r) => r.voucherId === a.voucherId);
    return sum + (row ? Number(row.pendingAmount) : 0);
  }, 0);

  async function onSubmit(values: PaymentFormValues) {
    if (hasCashLine && !values.cashSessionId) {
      form.setError('cashSessionId', {
        message: 'Elegí una caja: hay un medio de pago en efectivo',
      });
      return;
    }
    if (hasBankLine && !values.bankAccountId) {
      form.setError('bankAccountId', {
        message: 'Elegí una cuenta bancaria: hay un medio de pago bancario',
      });
      return;
    }

    try {
      const created = await createPayment.mutateAsync({
        partyId: values.partyId,
        direction,
        methodDetails: values.methodDetails.map((m) => {
          const method = methodById.get(m.paymentMethodId);
          return {
            paymentMethodId: m.paymentMethodId,
            amount: m.amount,
            reference: m.reference || undefined,
            checkDetail: method?.requiresCheckDetail
              ? {
                  number: m.checkNumber ?? '',
                  bankName: m.checkBankName ?? '',
                  dueDate: m.checkDueDate ?? '',
                }
              : undefined,
          };
        }),
        allocations: values.allocations.length > 0 ? values.allocations : undefined,
        cashSessionId: hasCashLine ? values.cashSessionId : undefined,
        bankAccountId: hasBankLine ? values.bankAccountId : undefined,
        idempotencyKey: idempotencyKeyRef.current,
      });
      toast.success(direction === 'COLLECTION' ? 'Cobro registrado' : 'Pago registrado');
      router.push(`/${companyId}/tesoreria/cobros-pagos/${created.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo registrar la operación');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{partyLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="partyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{partyLabel}</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <FormControl>
                      <SelectTrigger className="w-full max-w-sm">
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
          </CardContent>
        </Card>

        {partyId && (
          <Card>
            <CardHeader>
              <CardTitle>Comprobantes pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              <PendingVouchersPicker companyId={companyId} rows={pendingRows} isLoading={pendingLoading} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Medios de pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medio</TableHead>
                    <TableHead>Importe</TableHead>
                    <TableHead>Detalle</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {methodFields.map((field, index) => (
                    <PaymentMethodLineRow
                      key={field.id}
                      index={index}
                      paymentMethods={paymentMethods.data ?? []}
                      onRemove={() => removeMethod(index)}
                      canRemove={methodFields.length > 1}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={() => appendMethod(EMPTY_METHOD_DETAIL)}>
              + Agregar medio de pago
            </Button>

            {hasCashLine && (
              <FormField
                control={form.control}
                name="cashSessionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Caja</FormLabel>
                    {!sessionsLoading && openSessions.length === 0 ? (
                      <p className="text-sm text-destructive">
                        No hay ninguna caja abierta.{' '}
                        <Link href={`/${companyId}/caja-bancos/caja`} className="underline">
                          Abrí una sesión de caja
                        </Link>{' '}
                        antes de registrar un cobro/pago en efectivo.
                      </p>
                    ) : (
                      <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                        <FormControl>
                          <SelectTrigger className="w-full max-w-sm">
                            <SelectValue placeholder="Elegí una caja" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {openSessions.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.cashRegisterName} ({s.branchName})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {hasBankLine && (
              <FormField
                control={form.control}
                name="bankAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cuenta bancaria</FormLabel>
                    {activeBankAccounts.length === 0 ? (
                      <p className="text-sm text-destructive">
                        No hay ninguna cuenta bancaria activa.{' '}
                        <Link href={`/${companyId}/caja-bancos/bancos`} className="underline">
                          Dá de alta una cuenta
                        </Link>{' '}
                        antes de registrar un cobro/pago bancario.
                      </p>
                    ) : (
                      <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                        <FormControl>
                          <SelectTrigger className="w-full max-w-sm">
                            <SelectValue placeholder="Elegí una cuenta bancaria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeBankAccounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.bankName} {a.accountNumber ? `— ${a.accountNumber}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        <PaymentSummary
          direction={direction}
          totalSelected={totalSelected}
          totalAllocated={totalAllocated}
          totalMethods={totalMethods}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting
            ? 'Guardando…'
            : direction === 'COLLECTION'
              ? 'Confirmar cobro'
              : 'Confirmar pago'}
        </Button>
      </form>
    </Form>
  );
}
