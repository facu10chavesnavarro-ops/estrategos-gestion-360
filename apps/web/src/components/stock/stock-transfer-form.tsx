'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useItems } from '@/lib/api/catalog/items';
import { useAllWarehouses } from '@/lib/api/inventory/warehouses';
import { useCreateStockTransfer } from '@/lib/api/inventory/stock-movements';
import { ApiError } from '@/lib/api/http-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const transferSchema = z
  .object({
    fromWarehouseId: z.string().min(1, 'Elegí el depósito de origen'),
    toWarehouseId: z.string().min(1, 'Elegí el depósito de destino'),
    itemId: z.string().min(1, 'Elegí un ítem'),
    quantity: z
      .string()
      .min(1, 'La cantidad es obligatoria')
      .refine((v) => Number(v) > 0, 'La cantidad debe ser mayor a cero'),
    reason: z.string().min(1, 'El motivo es obligatorio'),
  })
  .refine((v) => v.fromWarehouseId !== v.toWarehouseId, {
    message: 'El origen y el destino deben ser depósitos distintos',
    path: ['toWarehouseId'],
  });

type TransferFormValues = z.infer<typeof transferSchema>;

/** Transferencia de stock entre depósitos (F4 §5.5) — RN-STK-06/07/09/13. */
export function StockTransferForm({
  companyId,
  defaultFromWarehouseId,
}: {
  companyId: string;
  defaultFromWarehouseId?: string;
}) {
  const router = useRouter();
  const { warehouses } = useAllWarehouses(companyId);
  const activeWarehouses = warehouses.filter((w) => w.isActive);
  const items = useItems(companyId, { type: 'PRODUCT', isActive: true });
  const stockItems = (items.data ?? []).filter((i) => i.tracksStock);
  const createTransfer = useCreateStockTransfer(companyId);

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      fromWarehouseId: defaultFromWarehouseId ?? '',
      toWarehouseId: '',
      itemId: '',
      quantity: '',
      reason: '',
    },
  });

  useEffect(() => {
    if (defaultFromWarehouseId) {
      form.setValue('fromWarehouseId', defaultFromWarehouseId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultFromWarehouseId]);

  async function onSubmit(values: TransferFormValues) {
    try {
      await createTransfer.mutateAsync(values);
      toast.success('Transferencia realizada');
      router.push(`/${companyId}/stock/depositos/${values.toWarehouseId}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo realizar la transferencia');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-4">
        <FormField
          control={form.control}
          name="fromWarehouseId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Depósito de origen</FormLabel>
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

        <FormField
          control={form.control}
          name="toWarehouseId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Depósito de destino</FormLabel>
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

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Reposición, redistribución..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Transfiriendo…' : 'Transferir'}
        </Button>
      </form>
    </Form>
  );
}
