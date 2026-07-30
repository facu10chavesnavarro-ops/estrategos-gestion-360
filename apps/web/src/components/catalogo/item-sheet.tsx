'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { type Item, type ItemInput, type ItemType, useCreateItem, useUpdateItem } from '@/lib/api/catalog/items';
import { useCategories } from '@/lib/api/catalog/categories';
import { useTaxes } from '@/lib/api/catalog/taxes';
import { ApiError } from '@/lib/api/http-client';
import { omitEmptyStrings } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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

const NO_CATEGORY = '__none__';

const itemSchema = z.object({
  sku: z.string().min(1, 'El SKU es obligatorio'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  longDescription: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string(),
  unitOfMeasure: z.string().min(1, 'La unidad de medida es obligatoria'),
  tracksStock: z.boolean(),
  minimumStock: z
    .string()
    .optional()
    .refine((v) => !v || Number(v) >= 0, 'No puede ser negativo'),
  costPrice: z
    .string()
    .optional()
    .refine((v) => !v || Number(v) >= 0, 'No puede ser negativo'),
});

type ItemFormValues = z.infer<typeof itemSchema>;

function toFormValues(item?: Item): ItemFormValues {
  return {
    sku: item?.sku ?? '',
    name: item?.name ?? '',
    description: item?.description ?? '',
    longDescription: item?.longDescription ?? '',
    barcode: item?.barcode ?? '',
    categoryId: item?.categoryId ?? NO_CATEGORY,
    unitOfMeasure: item?.unitOfMeasure ?? '',
    tracksStock: item?.tracksStock ?? false,
    minimumStock: item?.minimumStock ?? '',
    costPrice: item?.costPrice ?? '',
  };
}

export function ItemSheet({
  companyId,
  type,
  open,
  onOpenChange,
  item,
}: {
  companyId: string;
  /** Fijo para el alta según la tab activa (Productos/Servicios); RN-CAT-06: inmutable tras crear. */
  type: ItemType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si se pasa, edita; si no, crea un nuevo ítem. */
  item?: Item;
}) {
  const createItem = useCreateItem(companyId);
  const updateItem = useUpdateItem(companyId);
  const categories = useCategories(companyId, true);
  const taxes = useTaxes(companyId, true);
  const isEditing = Boolean(item);
  const [taxIds, setTaxIds] = useState<string[]>([]);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: toFormValues(),
  });

  useEffect(() => {
    if (open) {
      form.reset(toFormValues(item));
      setTaxIds(item?.taxIds ?? []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item]);

  const tracksStock = form.watch('tracksStock');
  const isProduct = type === 'PRODUCT';

  function toggleTax(taxId: string, checked: boolean) {
    setTaxIds((prev) => (checked ? [...prev, taxId] : prev.filter((id) => id !== taxId)));
  }

  async function onSubmit(values: ItemFormValues) {
    const base = omitEmptyStrings({
      ...values,
      categoryId: values.categoryId === NO_CATEGORY ? undefined : values.categoryId,
      tracksStock: isProduct ? values.tracksStock : false,
      minimumStock: isProduct && values.tracksStock ? values.minimumStock : undefined,
      taxIds,
    });

    try {
      if (item) {
        // RN-CAT-06: el tipo es inmutable — no se envía en la edición
        // (el backend rechaza la propiedad "type" en el PATCH).
        await updateItem.mutateAsync({ itemId: item.id, input: base });
        toast.success('Ítem actualizado');
      } else {
        await createItem.mutateAsync({ ...base, type } as ItemInput);
        toast.success('Ítem creado');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo guardar el ítem');
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {isEditing ? 'Editar' : 'Nuevo'} {isProduct ? 'producto' : 'servicio'}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
          >
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
              name="barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código de barras</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unitOfMeasure"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidad de medida</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="unidad, kg, hora..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY}>(sin categoría)</SelectItem>
                      {categories.data?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción corta</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="longDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción larga</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="costPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Costo</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isProduct && (
              <FormField
                control={form.control}
                name="tracksStock"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                      <FormLabel className="!mt-0">Controla stock</FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isProduct && tracksStock && (
              <FormField
                control={form.control}
                name="minimumStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock mínimo</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(taxes.data?.length ?? 0) > 0 && (
              <div className="grid gap-2">
                <Label>Impuestos</Label>
                <div className="space-y-2">
                  {taxes.data?.map((tax) => (
                    <div key={tax.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={taxIds.includes(tax.id)}
                        onCheckedChange={(checked) => toggleTax(tax.id, checked === true)}
                      />
                      <Label className="font-normal">
                        {tax.name} ({tax.rate}%)
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <SheetFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Guardando…'
                  : isEditing
                    ? 'Guardar cambios'
                    : `Crear ${isProduct ? 'producto' : 'servicio'}`}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
