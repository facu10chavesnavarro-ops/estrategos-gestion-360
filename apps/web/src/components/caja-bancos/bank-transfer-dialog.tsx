'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { type BankAccount, useCreateBankMovement } from '@/lib/api/treasury/cash-bank';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const transferSchema = z.object({
  destinationAccountId: z.string().min(1, 'Elegí la cuenta de destino'),
  amount: z
    .string()
    .min(1, 'El importe es obligatorio')
    .refine((v) => Number(v) > 0, 'Debe ser mayor a cero'),
  date: z.string().min(1, 'La fecha es obligatoria'),
  note: z.string().optional(),
});

type TransferFormValues = z.infer<typeof transferSchema>;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Transferencia entre cuentas bancarias (F7 §3.2): el backend no tiene
 * ningún concepto de transferencia — esto dispara dos `POST`
 * independientes (egreso en origen + ingreso en destino). Si el segundo
 * falla después de que el primero tuvo éxito, se informa explícitamente
 * el estado parcial en vez de ocultarlo o reintentar solo.
 */
export function BankTransferDialog({
  companyId,
  sourceAccount,
  otherAccounts,
  open,
  onOpenChange,
}: {
  companyId: string;
  sourceAccount: BankAccount;
  /** Otras cuentas activas — opciones de destino. */
  otherAccounts: BankAccount[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createBankMovement = useCreateBankMovement(companyId);

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: { destinationAccountId: '', amount: '', date: today(), note: '' },
  });

  useEffect(() => {
    if (open) form.reset({ destinationAccountId: '', amount: '', date: today(), note: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: TransferFormValues) {
    const destination = otherAccounts.find((a) => a.id === values.destinationAccountId);
    if (!destination) return;

    const extra = values.note ? ` — ${values.note}` : '';
    const withdrawalDescription = `Transferencia a ${destination.bankName}${destination.alias ? ` (${destination.alias})` : ''}${extra}`;
    const depositDescription = `Transferencia desde ${sourceAccount.bankName}${sourceAccount.alias ? ` (${sourceAccount.alias})` : ''}${extra}`;

    try {
      await createBankMovement.mutateAsync({
        bankAccountId: sourceAccount.id,
        type: 'WITHDRAWAL',
        amount: values.amount,
        description: withdrawalDescription,
        date: values.date,
      });
    } catch {
      toast.error('No se pudo registrar el egreso en la cuenta de origen — la transferencia no se realizó.');
      return;
    }

    try {
      await createBankMovement.mutateAsync({
        bankAccountId: destination.id,
        type: 'DEPOSIT',
        amount: values.amount,
        description: depositDescription,
        date: values.date,
      });
      toast.success('Transferencia registrada en ambas cuentas');
      onOpenChange(false);
    } catch {
      toast.error(
        `El egreso en ${sourceAccount.bankName} se registró, pero el ingreso en ${destination.bankName} falló — ` +
          'agregalo manualmente desde esa cuenta para completar la transferencia.',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir desde {sourceAccount.bankName}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="destinationAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cuenta de destino</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Elegí una cuenta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {otherAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.bankName}
                          {a.alias ? ` — ${a.alias}` : ''}
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
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: cubrir pago a proveedor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-xs text-muted-foreground">
              Se registran dos movimientos independientes (un egreso acá y un ingreso en la cuenta de
              destino) — el backend no tiene un concepto de transferencia atómica.
            </p>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Transfiriendo…' : 'Confirmar transferencia'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
