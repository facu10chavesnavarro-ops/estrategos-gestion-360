'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { type CashMovementType, useCreateCashMovement } from '@/lib/api/treasury/cash-bank';
import { ApiError } from '@/lib/api/http-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const movementSchema = z.object({
  amount: z
    .string()
    .min(1, 'El importe es obligatorio')
    .refine((v) => Number(v) > 0, 'Debe ser mayor a cero'),
  reason: z.string().min(3, 'El motivo debe tener al menos 3 caracteres'),
});

type MovementFormValues = z.infer<typeof movementSchema>;

const TITLES: Record<CashMovementType, string> = { IN: 'Registrar ingreso', OUT: 'Registrar egreso' };

/** Ingreso/egreso manual de caja (F7 §5.3) — RN-CASH-05: `reason` obligatorio. */
export function CashMovementDialog({
  companyId,
  cashSessionId,
  type,
  open,
  onOpenChange,
}: {
  companyId: string;
  cashSessionId: string;
  type: CashMovementType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createCashMovement = useCreateCashMovement(companyId);

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: { amount: '', reason: '' },
  });

  useEffect(() => {
    if (open) form.reset({ amount: '', reason: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: MovementFormValues) {
    try {
      await createCashMovement.mutateAsync({ cashSessionId, type, amount: values.amount, reason: values.reason });
      toast.success(type === 'IN' ? 'Ingreso registrado' : 'Egreso registrado');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo registrar el movimiento');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{TITLES[type]}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Importe</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" placeholder="0.00" {...field} />
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
                    <Textarea placeholder="Ej: retiro para depósito bancario" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Guardando…' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
