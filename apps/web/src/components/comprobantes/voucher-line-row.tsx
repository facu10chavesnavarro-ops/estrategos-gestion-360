'use client';

import { useFormContext } from 'react-hook-form';
import { X } from 'lucide-react';
import type { Item } from '@/lib/api/catalog/items';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { TableCell, TableRow } from '@/components/ui/table';
import type { VoucherFormValues } from './voucher-form';

/**
 * Fila de línea dentro de VoucherForm (F5 §5.4). Al elegir un ítem
 * precarga descripción y precio (`Item.costPrice`) — es una conveniencia
 * de UX, el usuario puede editar ambos antes de confirmar (§3.7 del doc
 * de arquitectura).
 */
export function VoucherLineRow({
  index,
  items,
  onRemove,
  canRemove,
}: {
  index: number;
  items: Item[];
  onRemove: () => void;
  canRemove: boolean;
}) {
  const { control, setValue, getValues } = useFormContext<VoucherFormValues>();

  function handleItemChange(itemId: string) {
    const item = items.find((i) => i.id === itemId);
    if (item) {
      if (!getValues(`lines.${index}.description`)) {
        setValue(`lines.${index}.description`, item.name);
      }
      if (!getValues(`lines.${index}.unitPrice`)) {
        setValue(`lines.${index}.unitPrice`, item.costPrice ?? '');
      }
    }
  }

  return (
    <TableRow>
      <TableCell className="min-w-48 align-top">
        <FormField
          control={control}
          name={`lines.${index}.itemId`}
          render={({ field }) => (
            <FormItem>
              <Select
                value={field.value}
                onValueChange={(v) => {
                  if (v) {
                    field.onChange(v);
                    handleItemChange(v);
                  }
                }}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Elegí un ítem" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name} ({i.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </TableCell>
      <TableCell className="min-w-24 align-top">
        <FormField
          control={control}
          name={`lines.${index}.quantity`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input inputMode="decimal" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </TableCell>
      <TableCell className="min-w-28 align-top">
        <FormField
          control={control}
          name={`lines.${index}.unitPrice`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input inputMode="decimal" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </TableCell>
      <TableCell className="min-w-24 align-top">
        <FormField
          control={control}
          name={`lines.${index}.discountPercentage`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input inputMode="decimal" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </TableCell>
      <TableCell className="align-top">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label="Quitar línea"
        >
          <X className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
