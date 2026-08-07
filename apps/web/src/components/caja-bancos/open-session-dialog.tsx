'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { type CashRegisterWithBranch, useOpenCashSession } from '@/lib/api/treasury/cash-bank';
import { ApiError } from '@/lib/api/http-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const openSessionSchema = z.object({
  cashRegisterId: z.string().min(1, 'Elegí una caja'),
  openingBalance: z
    .string()
    .min(1, 'El saldo inicial es obligatorio')
    .refine((v) => Number(v) >= 0, 'No puede ser negativo'),
});

type OpenSessionFormValues = z.infer<typeof openSessionSchema>;

/**
 * Apertura de turno (F7 §5.3, EXPERIENCIA DE USUARIO del brief): 1) elegir
 * caja 2) informar saldo inicial 3) confirmar. Si se abre ya con una caja
 * elegida (desde su propio detalle), el paso 1 queda fijo y no editable.
 */
export function OpenSessionDialog({
  companyId,
  open,
  onOpenChange,
  cashRegisters,
  fixedCashRegister,
  onOpened,
}: {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Cajas activas sin sesión abierta — opciones cuando no hay una fija. */
  cashRegisters: CashRegisterWithBranch[];
  fixedCashRegister?: CashRegisterWithBranch;
  onOpened?: (sessionId: string, cashRegisterId: string) => void;
}) {
  const openCashSession = useOpenCashSession(companyId);

  const form = useForm<OpenSessionFormValues>({
    resolver: zodResolver(openSessionSchema),
    defaultValues: { cashRegisterId: '', openingBalance: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({ cashRegisterId: fixedCashRegister?.id ?? '', openingBalance: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fixedCashRegister]);

  async function onSubmit(values: OpenSessionFormValues) {
    const register = fixedCashRegister ?? cashRegisters.find((r) => r.id === values.cashRegisterId);
    if (!register) return;
    try {
      const session = await openCashSession.mutateAsync({
        branchId: register.branchId,
        cashRegisterId: register.id,
        openingBalance: values.openingBalance,
      });
      toast.success('Turno abierto');
      onOpenChange(false);
      onOpened?.(session.id, register.id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo abrir el turno');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir turno{fixedCashRegister ? ` — ${fixedCashRegister.name}` : ''}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!fixedCashRegister && (
              <FormField
                control={form.control}
                name="cashRegisterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Caja</FormLabel>
                    <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Elegí una caja" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cashRegisters.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name} ({r.branchName})
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
              name="openingBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Saldo inicial</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Abriendo…' : 'Confirmar apertura'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
