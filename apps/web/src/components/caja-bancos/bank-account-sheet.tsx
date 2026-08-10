'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  type BankAccount,
  useCreateBankAccount,
  useUpdateBankAccount,
} from '@/lib/api/treasury/cash-bank';
import { useAccountingActive } from '@/lib/api/accounting/settings';
import { AccountSelect } from '@/components/contabilidad/account-select';
import { ApiError } from '@/lib/api/http-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const bankAccountSchema = z.object({
  bankName: z.string().min(1, 'El banco es obligatorio'),
  accountType: z.enum(['CHECKING', 'SAVINGS']),
  accountNumber: z.string().optional(),
  cbu: z.string().optional(),
  alias: z.string().optional(),
  currency: z.string().optional(),
});

type BankAccountFormValues = z.infer<typeof bankAccountSchema>;

/**
 * Alta/edición de cuenta bancaria. `accountType`/`currency` solo se
 * piden al crear — el backend no admite cambiarlos después (evita
 * corromper montos ya registrados en otra moneda, ver
 * 10-sprint-f7-caja-bancos.md §2.1).
 */
export function BankAccountSheet({
  companyId,
  open,
  onOpenChange,
  bankAccount,
}: {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si se pasa, edita; si no, crea una nueva cuenta. */
  bankAccount?: BankAccount;
}) {
  const createBankAccount = useCreateBankAccount(companyId);
  const updateBankAccount = useUpdateBankAccount(companyId);
  const { accountingActive } = useAccountingActive(companyId);
  const isEditing = Boolean(bankAccount);

  const [glAccountId, setGlAccountId] = useState<string | null>(null);

  const form = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      bankName: '',
      accountType: 'CHECKING',
      accountNumber: '',
      cbu: '',
      alias: '',
      currency: 'ARS',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        bankName: bankAccount?.bankName ?? '',
        accountType: bankAccount?.accountType ?? 'CHECKING',
        accountNumber: bankAccount?.accountNumber ?? '',
        cbu: bankAccount?.cbu ?? '',
        alias: bankAccount?.alias ?? '',
        currency: bankAccount?.currency ?? 'ARS',
      });
      setGlAccountId(bankAccount?.glAccountId ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bankAccount]);

  async function onSubmit(values: BankAccountFormValues) {
    try {
      if (bankAccount) {
        await updateBankAccount.mutateAsync({
          bankAccountId: bankAccount.id,
          input: {
            bankName: values.bankName,
            accountNumber: values.accountNumber || undefined,
            cbu: values.cbu || undefined,
            alias: values.alias || undefined,
            glAccountId: glAccountId ?? undefined,
          },
        });
        toast.success('Cuenta actualizada');
      } else {
        await createBankAccount.mutateAsync({
          bankName: values.bankName,
          accountType: values.accountType,
          accountNumber: values.accountNumber || undefined,
          cbu: values.cbu || undefined,
          alias: values.alias || undefined,
          currency: values.currency || undefined,
        });
        toast.success('Cuenta creada');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo guardar la cuenta');
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Editar cuenta bancaria' : 'Nueva cuenta bancaria'}</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4 px-4">
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banco</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Banco Nación" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <FormField
                control={form.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de cuenta</FormLabel>
                    <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CHECKING">Cuenta corriente</SelectItem>
                        <SelectItem value="SAVINGS">Caja de ahorro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="alias"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alias</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="empresa.caja.principal" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cbu"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CBU / CVU</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="0000000000000000000000" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>N.º de cuenta</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
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
            )}

            {isEditing && accountingActive && (
              <div className="grid gap-2">
                <Label>Cuenta contable</Label>
                <AccountSelect companyId={companyId} value={glAccountId} onChange={setGlAccountId} />
              </div>
            )}

            <SheetFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Guardando…'
                  : isEditing
                    ? 'Guardar cambios'
                    : 'Crear cuenta'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
