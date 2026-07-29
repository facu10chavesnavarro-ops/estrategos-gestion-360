'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  type Branch,
  useCreateBranch,
  useUpdateBranch,
} from '@/lib/api/companies';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const branchSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  address: z.string().optional(),
  phone: z.string().optional(),
});

type BranchFormValues = z.infer<typeof branchSchema>;

export function BranchSheet({
  companyId,
  open,
  onOpenChange,
  branch,
}: {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si se pasa, edita; si no, crea una nueva sucursal. */
  branch?: Branch;
}) {
  const createBranch = useCreateBranch(companyId);
  const updateBranch = useUpdateBranch(companyId);
  const isEditing = Boolean(branch);

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: { name: '', address: '', phone: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: branch?.name ?? '',
        address: branch?.address ?? '',
        phone: branch?.phone ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, branch]);

  async function onSubmit(values: BranchFormValues) {
    try {
      if (branch) {
        await updateBranch.mutateAsync({ branchId: branch.id, input: values });
        toast.success('Sucursal actualizada');
      } else {
        await createBranch.mutateAsync(values);
        toast.success('Sucursal creada');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo guardar la sucursal');
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Editar sucursal' : 'Nueva sucursal'}</SheetTitle>
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
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
                    : 'Crear sucursal'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
