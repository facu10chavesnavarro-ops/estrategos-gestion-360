'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useBranches } from '@/lib/api/companies';
import {
  type PointOfSaleWithBranch,
  useCreatePointOfSale,
  useUpdatePointOfSale,
} from '@/lib/api/vouchers/point-of-sale';
import { ApiError } from '@/lib/api/http-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const pointOfSaleSchema = z.object({
  code: z.string().min(1, 'El código es obligatorio'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  branchId: z.string().min(1, 'Elegí una sucursal'),
});

type PointOfSaleFormValues = z.infer<typeof pointOfSaleSchema>;

/**
 * Alta/edición de punto de venta. `code` (identificador fiscal) y
 * `branchId` solo se piden al crear — el backend no admite cambiarlos
 * después (PATCH solo acepta `name`), mismo criterio que Depósitos (F4).
 */
export function PointOfSaleSheet({
  companyId,
  open,
  onOpenChange,
  pointOfSale,
  defaultBranchId,
}: {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si se pasa, edita; si no, crea un nuevo punto de venta. */
  pointOfSale?: PointOfSaleWithBranch;
  defaultBranchId?: string;
}) {
  const branches = useBranches(companyId);
  const createPointOfSale = useCreatePointOfSale(companyId);
  const updatePointOfSale = useUpdatePointOfSale(companyId);
  const isEditing = Boolean(pointOfSale);

  const form = useForm<PointOfSaleFormValues>({
    resolver: zodResolver(pointOfSaleSchema),
    defaultValues: { code: '', name: '', branchId: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        code: pointOfSale?.code ?? '',
        name: pointOfSale?.name ?? '',
        branchId: pointOfSale?.branchId ?? defaultBranchId ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pointOfSale, defaultBranchId]);

  async function onSubmit(values: PointOfSaleFormValues) {
    try {
      if (pointOfSale) {
        await updatePointOfSale.mutateAsync({
          branchId: pointOfSale.branchId,
          pointOfSaleId: pointOfSale.id,
          input: { name: values.name },
        });
        toast.success('Punto de venta actualizado');
      } else {
        await createPointOfSale.mutateAsync({
          branchId: values.branchId,
          input: { code: values.code, name: values.name },
        });
        toast.success('Punto de venta creado');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo guardar el punto de venta');
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Editar punto de venta' : 'Nuevo punto de venta'}</SheetTitle>
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
                      <Input {...field} placeholder="0001" />
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
                    <Input {...field} placeholder="Casa central" />
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

            <SheetFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Guardando…'
                  : isEditing
                    ? 'Guardar cambios'
                    : 'Crear punto de venta'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
