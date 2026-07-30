'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { type Tax, type TaxType, useCreateTax, useUpdateTax } from '@/lib/api/catalog/taxes';
import { ApiError } from '@/lib/api/http-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const TAX_TYPE_LABELS: Record<TaxType, string> = {
  VAT: 'IVA',
  PERCEPTION: 'Percepción',
  WITHHOLDING: 'Retención',
};

const createSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  type: z.enum(['VAT', 'PERCEPTION', 'WITHHOLDING']),
  rate: z.string().min(1, 'La tasa es obligatoria'),
});

const editSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
});

/**
 * Sin campos de tasa/vigencia en edición: son inmutables una vez creado
 * el impuesto (RN-CAT-10) — "editar" una tasa es cerrarla y crear una
 * nueva, no hay endpoint que la modifique.
 */
export function TaxSheet({
  companyId,
  open,
  onOpenChange,
  tax,
}: {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si se pasa, edita (solo nombre); si no, crea un nuevo impuesto. */
  tax?: Tax;
}) {
  const createTax = useCreateTax(companyId);
  const updateTax = useUpdateTax(companyId);
  const isEditing = Boolean(tax);
  const schema = isEditing ? editSchema : createSchema;

  const form = useForm<{ name: string; type?: TaxType; rate?: string }>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', type: 'VAT', rate: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: tax?.name ?? '', type: tax?.type ?? 'VAT', rate: tax?.rate ?? '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tax]);

  async function onSubmit(values: { name: string; type?: TaxType; rate?: string }) {
    try {
      if (tax) {
        await updateTax.mutateAsync({ taxId: tax.id, input: { name: values.name } });
        toast.success('Impuesto actualizado');
      } else {
        await createTax.mutateAsync({
          name: values.name,
          type: values.type!,
          rate: values.rate!,
        });
        toast.success('Impuesto creado');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo guardar el impuesto');
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Editar impuesto' : 'Nuevo impuesto'}</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4 px-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="IVA 21%" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <>
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(TAX_TYPE_LABELS) as TaxType[]).map((t) => (
                            <SelectItem key={t} value={t}>
                              {TAX_TYPE_LABELS[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tasa (%)</FormLabel>
                      <FormControl>
                        <Input inputMode="decimal" {...field} placeholder="21" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  La tasa y la vigencia no se pueden editar después de crear el impuesto. Para
                  cambiarlas, cerrá este impuesto y creá uno nuevo.
                </p>
              </>
            )}

            <SheetFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Guardando…'
                  : isEditing
                    ? 'Guardar cambios'
                    : 'Crear impuesto'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
