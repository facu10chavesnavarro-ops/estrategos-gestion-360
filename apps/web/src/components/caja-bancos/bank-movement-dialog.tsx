'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { type BankMovementType, useCreateBankMovement } from '@/lib/api/treasury/cash-bank';
import { useAccountingActive } from '@/lib/api/accounting/settings';
import { AccountSelect } from '@/components/contabilidad/account-select';
import { ApiError } from '@/lib/api/http-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  description: z.string().min(3, 'La descripción debe tener al menos 3 caracteres'),
  date: z.string().min(1, 'La fecha es obligatoria'),
});

type MovementFormValues = z.infer<typeof movementSchema>;

const TITLES: Record<BankMovementType, string> = { DEPOSIT: 'Registrar depósito', WITHDRAWAL: 'Registrar extracción' };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Ingreso/egreso manual de banco (F7 §5.5) — RN-BANK-03: `description` obligatoria. */
export function BankMovementDialog({
  companyId,
  bankAccountId,
  type,
  open,
  onOpenChange,
}: {
  companyId: string;
  bankAccountId: string;
  type: BankMovementType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createBankMovement = useCreateBankMovement(companyId);
  const { accountingActive } = useAccountingActive(companyId);
  const [counterpartAccountId, setCounterpartAccountId] = useState<string | null>(null);

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: { amount: '', description: '', date: today() },
  });

  useEffect(() => {
    if (open) {
      form.reset({ amount: '', description: '', date: today() });
      setCounterpartAccountId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // RN-ACC-06 (F8): con Contabilidad activa, la contrapartida es obligatoria.
  const missingCounterpart = accountingActive === true && !counterpartAccountId;

  async function onSubmit(values: MovementFormValues) {
    try {
      await createBankMovement.mutateAsync({
        bankAccountId,
        type,
        amount: values.amount,
        description: values.description,
        date: values.date,
        counterpartAccountId: counterpartAccountId ?? undefined,
      });
      toast.success(type === 'DEPOSIT' ? 'Depósito registrado' : 'Extracción registrada');
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
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: pago de expensas" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {accountingActive && (
              <div className="grid gap-2">
                <Label>Cuenta contable contrapartida</Label>
                <AccountSelect
                  companyId={companyId}
                  value={counterpartAccountId}
                  onChange={setCounterpartAccountId}
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || missingCounterpart}>
                {form.formState.isSubmitting ? 'Guardando…' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
