'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useItems } from '@/lib/api/catalog/items';
import { useCreateStockAdjustment } from '@/lib/api/inventory/stock-movements';
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

const adjustmentSchema = z
  .object({
    itemId: z.string().min(1, 'Elegí un ítem'),
    direction: z.enum(['IN', 'OUT']),
    quantity: z
      .string()
      .min(1, 'La cantidad es obligatoria')
      .refine((v) => Number(v) > 0, 'La cantidad debe ser mayor a cero'),
    unitCost: z.string().optional(),
    reason: z.string().optional(),
  })
  .refine((v) => v.direction !== 'IN' || Boolean(v.unitCost), {
    message: 'El costo es obligatorio para una entrada',
    path: ['unitCost'],
  })
  .refine((v) => v.direction !== 'OUT' || Boolean(v.reason), {
    message: 'El motivo es obligatorio para una salida',
    path: ['reason'],
  });

type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;

/** Ajuste manual de stock (entrada o salida) — RN-STK-05/06/07/13. */
export function StockAdjustmentSheet({
  companyId,
  warehouseId,
  open,
  onOpenChange,
}: {
  companyId: string;
  warehouseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const items = useItems(companyId, { type: 'PRODUCT', isActive: true });
  const stockItems = (items.data ?? []).filter((i) => i.tracksStock);
  const createAdjustment = useCreateStockAdjustment(companyId, warehouseId);

  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { itemId: '', direction: 'IN', quantity: '', unitCost: '', reason: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({ itemId: '', direction: 'IN', quantity: '', unitCost: '', reason: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const direction = form.watch('direction');

  async function onSubmit(values: AdjustmentFormValues) {
    try {
      await createAdjustment.mutateAsync({
        itemId: values.itemId,
        direction: values.direction,
        quantity: values.quantity,
        unitCost: values.direction === 'IN' ? values.unitCost : undefined,
        reason: values.direction === 'OUT' ? values.reason : undefined,
      });
      toast.success('Movimiento registrado');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo registrar el ajuste');
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Ajustar stock</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4 px-4">
            <FormField
              control={form.control}
              name="itemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ítem</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Elegí un producto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {stockItems.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name} ({i.sku})
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
              name="direction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="IN">Entrada</SelectItem>
                      <SelectItem value="OUT">Salida</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {direction === 'IN' && (
              <FormField
                control={form.control}
                name="unitCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo unitario</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {direction === 'OUT' && (
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Rotura, vencimiento, conteo físico..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <SheetFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Guardando…' : 'Registrar movimiento'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
