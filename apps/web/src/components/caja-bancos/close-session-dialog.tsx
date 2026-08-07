'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  type CashSession,
  type CashMovement,
  useCloseCashSession,
} from '@/lib/api/treasury/cash-bank';
import { ApiError } from '@/lib/api/http-client';
import { formatMoney } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const closeSessionSchema = z.object({
  closingBalance: z.string().min(1, 'El saldo contado es obligatorio'),
});

type CloseSessionFormValues = z.infer<typeof closeSessionSchema>;

/**
 * Cierre de turno (F7 §5.3, EXPERIENCIA DE USUARIO del brief): muestra
 * inicial/ingresos/egresos/esperado, pide el saldo contado y previsualiza
 * la diferencia en vivo — pero la fuente de verdad final es siempre la
 * respuesta del backend (`CloseCashSessionUseCase`), nunca este cálculo
 * local, que es solo para que el usuario entienda antes de confirmar.
 */
export function CloseSessionDialog({
  companyId,
  open,
  onOpenChange,
  session,
  movements,
}: {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: CashSession;
  movements: CashMovement[];
}) {
  const closeCashSession = useCloseCashSession(companyId);

  const form = useForm<CloseSessionFormValues>({
    resolver: zodResolver(closeSessionSchema),
    defaultValues: { closingBalance: '' },
  });

  const sumIn = movements.filter((m) => m.type === 'IN').reduce((sum, m) => sum + Number(m.amount), 0);
  const sumOut = movements.filter((m) => m.type === 'OUT').reduce((sum, m) => sum + Number(m.amount), 0);
  const expectedBalance = Number(session.openingBalance) + sumIn - sumOut;
  const closingBalanceInput = form.watch('closingBalance');
  const previewDifference =
    closingBalanceInput && !Number.isNaN(Number(closingBalanceInput))
      ? Number(closingBalanceInput) - expectedBalance
      : null;

  async function onSubmit(values: CloseSessionFormValues) {
    try {
      const closed = await closeCashSession.mutateAsync({
        cashSessionId: session.id,
        closingBalance: values.closingBalance,
      });
      const difference = Number(closed.difference);
      toast.success(
        difference === 0
          ? 'Turno cerrado sin diferencia'
          : `Turno cerrado con una diferencia de ${formatMoney(closed.difference ?? '0')}`,
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo cerrar el turno');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cerrar turno</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 rounded-lg border border-border p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Saldo inicial</span>
            <span className="font-mono">{formatMoney(session.openingBalance)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ingresos</span>
            <span className="font-mono">{formatMoney(sumIn.toFixed(2))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Egresos</span>
            <span className="font-mono">{formatMoney(sumOut.toFixed(2))}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1 font-semibold">
            <span>Saldo esperado</span>
            <span className="font-mono">{formatMoney(expectedBalance.toFixed(2))}</span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="closingBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Saldo contado</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {previewDifference !== null && (
              <p
                className={
                  Math.abs(previewDifference) < 0.001
                    ? 'text-sm text-muted-foreground'
                    : 'text-sm font-medium text-destructive'
                }
              >
                Diferencia: {formatMoney(previewDifference.toFixed(2))}
                {Math.abs(previewDifference) < 0.001 ? ' (sin diferencia)' : ''}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Cerrando…' : 'Confirmar cierre'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
