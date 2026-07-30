'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  type Category,
  useCreateCategory,
  useUpdateCategory,
} from '@/lib/api/catalog/categories';
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

const NO_PARENT = '__none__';

const categorySchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  parentId: z.string(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

/** Ids a excluir del selector de padre: la propia categoría + todos sus descendientes (evita ofrecer un ciclo que el backend rechazaría, RN-CAT-03). */
function collectExcludedIds(categories: Category[], rootId: string): Set<string> {
  const excluded = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of categories) {
      if (category.parentId && excluded.has(category.parentId) && !excluded.has(category.id)) {
        excluded.add(category.id);
        changed = true;
      }
    }
  }
  return excluded;
}

/** Opciones del selector en orden de árbol, con indentación por profundidad. */
function buildOptions(
  categories: Category[],
  excludedIds: Set<string>,
): Array<{ id: string; label: string }> {
  const byParent = new Map<string | null, Category[]>();
  for (const category of categories) {
    const list = byParent.get(category.parentId) ?? [];
    list.push(category);
    byParent.set(category.parentId, list);
  }

  const options: Array<{ id: string; label: string }> = [];
  function walk(parentId: string | null, depth: number) {
    for (const category of byParent.get(parentId) ?? []) {
      if (!excludedIds.has(category.id)) {
        options.push({ id: category.id, label: `${'— '.repeat(depth)}${category.name}` });
      }
      walk(category.id, depth + 1);
    }
  }
  walk(null, 0);
  return options;
}

export function CategorySheet({
  companyId,
  open,
  onOpenChange,
  categories,
  category,
  defaultParentId,
}: {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  /** Si se pasa, edita; si no, crea una nueva categoría. */
  category?: Category;
  /** Precarga el padre al crear una subcategoría desde el árbol. */
  defaultParentId?: string;
}) {
  const createCategory = useCreateCategory(companyId);
  const updateCategory = useUpdateCategory(companyId);
  const isEditing = Boolean(category);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', parentId: NO_PARENT },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: category?.name ?? '',
        parentId: (category?.parentId ?? defaultParentId) || NO_PARENT,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category, defaultParentId]);

  const excludedIds = category ? collectExcludedIds(categories, category.id) : new Set<string>();
  const options = buildOptions(categories, excludedIds);

  async function onSubmit(values: CategoryFormValues) {
    const parentId = values.parentId === NO_PARENT ? undefined : values.parentId;
    try {
      if (category) {
        await updateCategory.mutateAsync({
          categoryId: category.id,
          input: { name: values.name, parentId: parentId ?? null },
        });
        toast.success('Categoría actualizada');
      } else {
        await createCategory.mutateAsync({ name: values.name, parentId });
        toast.success('Categoría creada');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo guardar la categoría');
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Editar categoría' : 'Nueva categoría'}</SheetTitle>
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
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría padre</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_PARENT}>(raíz, sin padre)</SelectItem>
                      {options.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    : 'Crear categoría'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
