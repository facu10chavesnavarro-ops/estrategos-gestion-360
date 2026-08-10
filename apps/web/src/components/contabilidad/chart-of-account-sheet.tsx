'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  type ChartOfAccount,
  type AccountType,
  buildChartOfAccountsTree,
  collectExcludedAccountIds,
  useCreateChartOfAccount,
  useUpdateChartOfAccount,
} from '@/lib/api/accounting/chart-of-accounts';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const NO_PARENT = '__none__';

const TYPE_LABELS: Record<AccountType, string> = {
  ASSET: 'Activo',
  LIABILITY: 'Pasivo',
  EQUITY: 'Patrimonio Neto',
  INCOME: 'Ingreso',
  EXPENSE: 'Egreso',
};

const createSchema = z.object({
  code: z.string().min(1, 'El código es obligatorio'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']),
  allowsMovements: z.boolean(),
  parentId: z.string(),
});

const editSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  parentId: z.string(),
});

type FormValues = {
  code?: string;
  name: string;
  type?: AccountType;
  allowsMovements?: boolean;
  parentId: string;
};

/**
 * Alta/edición de cuenta contable (F8 §5.2). `code`/`type`/
 * `allowsMovements` son inmutables tras crear (§2.2,
 * docs/frontend/11-sprint-f8-contabilidad.md) — solo se piden al
 * crear, no se muestran editables después.
 */
export function ChartOfAccountSheet({
  companyId,
  open,
  onOpenChange,
  accounts,
  account,
  defaultParentId,
}: {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: ChartOfAccount[];
  /** Si se pasa, edita (solo nombre/padre); si no, crea una nueva cuenta. */
  account?: ChartOfAccount;
  /** Precarga el padre al crear una subcuenta desde el árbol. */
  defaultParentId?: string;
}) {
  const createAccount = useCreateChartOfAccount(companyId);
  const updateAccount = useUpdateChartOfAccount(companyId);
  const isEditing = Boolean(account);
  const schema = isEditing ? editSchema : createSchema;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      code: '',
      name: '',
      type: 'ASSET',
      allowsMovements: true,
      parentId: NO_PARENT,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        code: account?.code ?? '',
        name: account?.name ?? '',
        type: account?.type ?? 'ASSET',
        allowsMovements: account?.allowsMovements ?? true,
        parentId: (account?.parentId ?? defaultParentId) || NO_PARENT,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, account, defaultParentId]);

  const excludedIds = account ? collectExcludedAccountIds(accounts, account.id) : new Set<string>();
  const parentOptions = buildChartOfAccountsTree(accounts).filter((a) => !excludedIds.has(a.id));

  async function onSubmit(values: FormValues) {
    const parentId = values.parentId === NO_PARENT ? undefined : values.parentId;
    try {
      if (account) {
        await updateAccount.mutateAsync({
          accountId: account.id,
          input: { name: values.name, parentId: parentId ?? null },
        });
        toast.success('Cuenta actualizada');
      } else {
        await createAccount.mutateAsync({
          code: values.code!,
          name: values.name,
          type: values.type!,
          allowsMovements: values.allowsMovements,
          parentId,
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
          <SheetTitle>{isEditing ? 'Editar cuenta' : 'Nueva cuenta'}</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4 px-4">
            {!isEditing && (
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="1.1.06" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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

            {!isEditing && (
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(TYPE_LABELS) as AccountType[]).map((t) => (
                          <SelectItem key={t} value={t}>
                            {TYPE_LABELS[t]}
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
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cuenta padre</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_PARENT}>(raíz, sin padre)</SelectItem>
                      {parentOptions.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {'— '.repeat(a.depth)}
                          {a.code} — {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <FormField
                control={form.control}
                name="allowsMovements"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-2 rounded-lg border p-3">
                    <div>
                      <FormLabel>Cuenta imputable</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Puede recibir líneas de asiento. Desactivá esto para una cuenta agrupadora
                        (solo de presentación, ej. &quot;1 Activo&quot;).
                      </p>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {!isEditing && (
              <p className="text-xs text-muted-foreground">
                El código, el tipo y si es imputable no se pueden editar después de crear la
                cuenta.
              </p>
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
