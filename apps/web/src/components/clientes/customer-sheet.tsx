'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  type Customer,
  type CustomerInput,
  useCreateCustomer,
  useUpdateCustomer,
} from '@/lib/api/customers';
import { ApiError } from '@/lib/api/http-client';
import { omitEmptyStrings } from '@/lib/utils';
import { PartyFormFields } from '@/components/parties/party-form-fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const customerSchema = z.object({
  legalName: z.string().min(2, 'La razón social debe tener al menos 2 caracteres'),
  taxId: z.string().optional(),
  taxCondition: z.string().optional(),
  email: z.string().email('El correo no tiene un formato válido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  contactName: z.string().optional(),
  notes: z.string().optional(),
  paymentTermDays: z
    .string()
    .optional()
    .refine((v) => !v || (Number.isInteger(Number(v)) && Number(v) >= 0), 'Debe ser un número entero no negativo'),
  creditLimit: z
    .string()
    .optional()
    .refine((v) => !v || Number(v) >= 0, 'El límite de crédito no puede ser negativo'),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

function toFormValues(customer?: Customer): CustomerFormValues {
  return {
    legalName: customer?.legalName ?? '',
    taxId: customer?.taxId ?? '',
    taxCondition: customer?.taxCondition ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
    address: customer?.address ?? '',
    contactName: customer?.contactName ?? '',
    notes: customer?.notes ?? '',
    paymentTermDays: customer?.paymentTermDays != null ? String(customer.paymentTermDays) : '',
    creditLimit: customer?.creditLimit ?? '',
  };
}

export function CustomerSheet({
  companyId,
  open,
  onOpenChange,
  customer,
}: {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si se pasa, edita; si no, crea un nuevo cliente. */
  customer?: Customer;
}) {
  const createCustomer = useCreateCustomer(companyId);
  const updateCustomer = useUpdateCustomer(companyId);
  const isEditing = Boolean(customer);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: toFormValues(),
  });

  useEffect(() => {
    if (open) {
      form.reset(toFormValues(customer));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer]);

  async function onSubmit(values: CustomerFormValues) {
    const input = omitEmptyStrings({
      ...values,
      paymentTermDays: values.paymentTermDays ? Number(values.paymentTermDays) : undefined,
    }) as CustomerInput;
    try {
      if (customer) {
        await updateCustomer.mutateAsync({ customerId: customer.id, input });
        toast.success('Cliente actualizado');
      } else {
        await createCustomer.mutateAsync(input);
        toast.success('Cliente creado');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo guardar el cliente');
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Editar cliente' : 'Nuevo cliente'}</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
          >
            <PartyFormFields />

            <FormField
              control={form.control}
              name="paymentTermDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Días de pago (condición de venta)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="creditLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Límite de crédito</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Guardando…'
                  : isEditing
                    ? 'Guardar cambios'
                    : 'Crear cliente'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
