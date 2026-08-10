'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useBranches } from '@/lib/api/companies';
import {
  type CashRegisterWithBranch,
  useCreateCashRegister,
  useUpdateCashRegister,
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

const cashRegisterSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  branchId: z.string().min(1, 'Elegí una sucursal'),
});

type CashRegisterFormValues = z.infer<typeof cashRegisterSchema>;

/**
 * Alta/edición de caja. La sucursal solo se pide al crear — el backend
 * no admite cambiarla después (`PATCH` solo acepta `name`/`accountId`)
 * — mismo criterio que `WarehouseSheet` (F4). El mapeo contable
 * (`accountId`) solo se ofrece al editar, y solo si Contabilidad está
 * activa (§3.9, docs/frontend/11-sprint-f8-contabilidad.md).
 */
export function CashRegisterSheet({
  companyId,
  open,
  onOpenChange,
  cashRegister,
  defaultBranchId,
}: {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si se pasa, edita; si no, crea una nueva caja. */
  cashRegister?: CashRegisterWithBranch;
  defaultBranchId?: string;
}) {
  const branches = useBranches(companyId);
  const createCashRegister = useCreateCashRegister(companyId);
  const updateCashRegister = useUpdateCashRegister(companyId);
  const { accountingActive } = useAccountingActive(companyId);
  const isEditing = Boolean(cashRegister);

  const form = useForm<CashRegisterFormValues>({
    resolver: zodResolver(cashRegisterSchema),
    defaultValues: { name: '', branchId: '' },
  });

  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      form.reset({
        name: cashRegister?.name ?? '',
        branchId: cashRegister?.branchId ?? defaultBranchId ?? '',
      });
      setAccountId(cashRegister?.accountId ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cashRegister, defaultBranchId]);

  async function onSubmit(values: CashRegisterFormValues) {
    try {
      if (cashRegister) {
        await updateCashRegister.mutateAsync({
          branchId: cashRegister.branchId,
          cashRegisterId: cashRegister.id,
          input: { name: values.name, accountId: accountId ?? undefined },
        });
        toast.success('Caja actualizada');
      } else {
        await createCashRegister.mutateAsync({ branchId: values.branchId, input: { name: values.name } });
        toast.success('Caja creada');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo guardar la caja');
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Editar caja' : 'Nueva caja'}</SheetTitle>
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
                    <Input {...field} placeholder="Caja principal" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sucursal</FormLabel>
                    <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Elegí una sucursal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(branches.data ?? [])
                          .filter((b) => b.isActive)
                          .map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isEditing && accountingActive && (
              <div className="grid gap-2">
                <Label>Cuenta contable</Label>
                <AccountSelect companyId={companyId} value={accountId} onChange={setAccountId} />
              </div>
            )}

            <SheetFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Guardando…'
                  : isEditing
                    ? 'Guardar cambios'
                    : 'Crear caja'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
