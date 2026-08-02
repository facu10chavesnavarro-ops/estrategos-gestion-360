'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useBranches } from '@/lib/api/companies';
import {
  type WarehouseWithBranch,
  useCreateWarehouse,
  useUpdateWarehouse,
} from '@/lib/api/inventory/warehouses';
import { ApiError } from '@/lib/api/http-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const warehouseSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  branchId: z.string().min(1, 'Elegí una sucursal'),
});

type WarehouseFormValues = z.infer<typeof warehouseSchema>;

/**
 * Alta/edición de depósito. La sucursal solo se pide al crear — el
 * backend no admite cambiarla después (PATCH solo acepta `name`), mismo
 * criterio que el `type` inmutable de Item en Catálogo (F3).
 */
export function WarehouseSheet({
  companyId,
  open,
  onOpenChange,
  warehouse,
  defaultBranchId,
}: {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si se pasa, edita; si no, crea un nuevo depósito. */
  warehouse?: WarehouseWithBranch;
  /** Precarga la sucursal al crear desde un contexto ya filtrado. */
  defaultBranchId?: string;
}) {
  const branches = useBranches(companyId);
  const createWarehouse = useCreateWarehouse(companyId);
  const updateWarehouse = useUpdateWarehouse(companyId);
  const isEditing = Boolean(warehouse);

  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: { name: '', branchId: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: warehouse?.name ?? '',
        branchId: warehouse?.branchId ?? defaultBranchId ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, warehouse, defaultBranchId]);

  async function onSubmit(values: WarehouseFormValues) {
    try {
      if (warehouse) {
        await updateWarehouse.mutateAsync({
          branchId: warehouse.branchId,
          warehouseId: warehouse.id,
          input: { name: values.name },
        });
        toast.success('Depósito actualizado');
      } else {
        await createWarehouse.mutateAsync({ branchId: values.branchId, input: { name: values.name } });
        toast.success('Depósito creado');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo guardar el depósito');
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Editar depósito' : 'Nuevo depósito'}</SheetTitle>
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
                    <Input {...field} placeholder="Depósito central" />
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
                    : 'Crear depósito'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
