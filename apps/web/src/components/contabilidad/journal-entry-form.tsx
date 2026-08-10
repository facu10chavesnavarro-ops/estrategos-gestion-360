'use client';

import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import {
  useCreateManualJournalEntry,
  computeJournalEntryDifference,
} from '@/lib/api/accounting/journal-entries';
import { ApiError } from '@/lib/api/http-client';
import { AccountSelect } from './account-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { formatMoney } from '@/lib/utils';

const lineSchema = z
  .object({
    accountId: z.string().min(1, 'Elegí una cuenta'),
    debit: z.string(),
    credit: z.string(),
    description: z.string().optional(),
  })
  .refine((l) => Number(l.debit || '0') > 0 || Number(l.credit || '0') > 0, {
    message: 'Cargá un débito o un crédito mayor a cero',
    path: ['debit'],
  });

const formSchema = z.object({
  date: z.string().optional(),
  description: z.string().min(1, 'El concepto es obligatorio'),
  lines: z.array(lineSchema).min(2, 'El asiento debe tener al menos dos líneas'),
});

type FormValues = z.infer<typeof formSchema>;

const EMPTY_LINE = { accountId: '', debit: '', credit: '', description: '' };

/**
 * Alta de asiento manual — flujo de 9 pasos del brief (F8 §5.6, §3.1
 * docs/frontend/11-sprint-f8-contabilidad.md): fecha → concepto →
 * líneas → cuenta → débito/crédito → diferencia en vivo → bloqueo
 * mientras Σdébitos≠Σcréditos → confirmar → asiento generado. El
 * balanceo definitivo lo valida el backend
 * (`UnbalancedJournalEntryError`) — acá solo se anticipa.
 */
export function JournalEntryForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const createEntry = useCreateManualJournalEntry(companyId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: '',
      description: '',
      lines: [EMPTY_LINE, EMPTY_LINE],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'lines' });
  const lines = form.watch('lines');
  const difference = computeJournalEntryDifference(lines);
  const balanced = lines.length >= 2 && difference === '0.00';

  async function onSubmit(values: FormValues) {
    try {
      const entry = await createEntry.mutateAsync({
        date: values.date || undefined,
        description: values.description,
        lines: values.lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit || '0',
          credit: l.credit || '0',
          description: l.description || undefined,
        })),
      });
      toast.success('Asiento creado');
      router.push(`/${companyId}/contabilidad/asientos/${entry.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo crear el asiento');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Datos del asiento</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Concepto</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ej: Ajuste de caja chica" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Líneas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_2fr_auto] sm:items-start">
                <FormField
                  control={form.control}
                  name={`lines.${index}.accountId`}
                  render={({ field: f }) => (
                    <FormItem>
                      {index === 0 && <FormLabel>Cuenta</FormLabel>}
                      <FormControl>
                        <AccountSelect companyId={companyId} value={f.value} onChange={(v) => f.onChange(v ?? '')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`lines.${index}.debit`}
                  render={({ field: f }) => (
                    <FormItem>
                      {index === 0 && <FormLabel>Débito</FormLabel>}
                      <FormControl>
                        <Input inputMode="decimal" placeholder="0.00" {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`lines.${index}.credit`}
                  render={({ field: f }) => (
                    <FormItem>
                      {index === 0 && <FormLabel>Crédito</FormLabel>}
                      <FormControl>
                        <Input inputMode="decimal" placeholder="0.00" {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`lines.${index}.description`}
                  render={({ field: f }) => (
                    <FormItem>
                      {index === 0 && <FormLabel>Descripción (opcional)</FormLabel>}
                      <FormControl>
                        <Input {...f} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={index === 0 ? 'sm:mt-6' : ''}
                  disabled={fields.length <= 2}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={() => append(EMPTY_LINE)}>
              + Agregar línea
            </Button>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm font-medium">Diferencia (Débitos − Créditos)</span>
              <span className={`font-mono text-sm font-semibold ${balanced ? 'text-[var(--ledger-green)]' : 'text-destructive'}`}>
                {formatMoney(difference)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={!balanced || form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Guardando…' : 'Confirmar asiento'}
        </Button>
      </form>
    </Form>
  );
}
