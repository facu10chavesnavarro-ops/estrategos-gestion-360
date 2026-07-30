'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  type Supplier,
  type SupplierInput,
  useCreateSupplier,
  useUpdateSupplier,
} from '@/lib/api/suppliers';
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

const supplierSchema = z.object({
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
  bankName: z.string().optional(),
  bankAccountHolder: z.string().optional(),
  bankCbu: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

function toFormValues(supplier?: Supplier): SupplierFormValues {
  return {
    legalName: supplier?.legalName ?? '',
    taxId: supplier?.taxId ?? '',
    taxCondition: supplier?.taxCondition ?? '',
    email: supplier?.email ?? '',
    phone: supplier?.phone ?? '',
    address: supplier?.address ?? '',
    contactName: supplier?.contactName ?? '',
    notes: supplier?.notes ?? '',
    paymentTermDays: supplier?.paymentTermDays != null ? String(supplier.paymentTermDays) : '',
    bankName: supplier?.bankName ?? '',
    bankAccountHolder: supplier?.bankAccountHolder ?? '',
    bankCbu: supplier?.bankCbu ?? '',
  };
}

export function SupplierSheet({
  companyId,
  open,
  onOpenChange,
  supplier,
}: {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si se pasa, edita; si no, crea un nuevo proveedor. */
  supplier?: Supplier;
}) {
  const createSupplier = useCreateSupplier(companyId);
  const updateSupplier = useUpdateSupplier(companyId);
  const isEditing = Boolean(supplier);

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: toFormValues(),
  });

  useEffect(() => {
    if (open) {
      form.reset(toFormValues(supplier));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, supplier]);

  async function onSubmit(values: SupplierFormValues) {
    const input = omitEmptyStrings({
      ...values,
      paymentTermDays: values.paymentTermDays ? Number(values.paymentTermDays) : undefined,
    }) as SupplierInput;
    try {
      if (supplier) {
        await updateSupplier.mutateAsync({ supplierId: supplier.id, input });
        toast.success('Proveedor actualizado');
      } else {
        await createSupplier.mutateAsync(input);
        toast.success('Proveedor creado');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo guardar el proveedor');
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Editar proveedor' : 'Nuevo proveedor'}</SheetTitle>
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
                  <FormLabel>Días de pago (condición de compra)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banco</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankAccountHolder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titular de la cuenta</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankCbu"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CBU</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    : 'Crear proveedor'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
