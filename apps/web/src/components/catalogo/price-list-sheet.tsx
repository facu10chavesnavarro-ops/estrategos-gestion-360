'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { type PriceList, useCreatePriceList, useUpdatePriceList } from '@/lib/api/catalog/price-lists';
import { ApiError } from '@/lib/api/http-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const priceListSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  currency: z.string().min(1, 'La moneda es obligatoria'),
  isDefault: z.boolean(),
});

type PriceListFormValues = z.infer<typeof priceListSchema>;

export function PriceListSheet({
  companyId,
  open,
  onOpenChange,
  priceList,
}: {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si se pasa, edita; si no, crea una nueva lista de precios. */
  priceList?: PriceList;
}) {
  const createPriceList = useCreatePriceList(companyId);
  const updatePriceList = useUpdatePriceList(companyId);
  const isEditing = Boolean(priceList);

  const form = useForm<PriceListFormValues>({
    resolver: zodResolver(priceListSchema),
    defaultValues: { name: '', currency: 'ARS', isDefault: false },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: priceList?.name ?? '',
        currency: priceList?.currency ?? 'ARS',
        isDefault: priceList?.isDefault ?? false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, priceList]);

  async function onSubmit(values: PriceListFormValues) {
    try {
      if (priceList) {
        await updatePriceList.mutateAsync({ priceListId: priceList.id, input: values });
        toast.success('Lista de precios actualizada');
      } else {
        await createPriceList.mutateAsync(values);
        toast.success('Lista de precios creada');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo guardar la lista de precios');
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Editar lista de precios' : 'Nueva lista de precios'}</SheetTitle>
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Moneda</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="ARS" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                    <FormLabel className="!mt-0">Predeterminada</FormLabel>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Marcarla como predeterminada quita la marca de la lista que lo era antes.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Guardando…'
                  : isEditing
                    ? 'Guardar cambios'
                    : 'Crear lista'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
