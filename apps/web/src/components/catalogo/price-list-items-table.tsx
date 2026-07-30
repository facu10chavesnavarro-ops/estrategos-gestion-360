'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  usePriceListItems,
  useSetPriceListItem,
  useRemovePriceListItem,
} from '@/lib/api/catalog/price-lists';
import { useItems, type Item } from '@/lib/api/catalog/items';
import { ApiError } from '@/lib/api/http-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function PriceCell({
  initialPrice,
  onSave,
}: {
  initialPrice: string;
  onSave: (price: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initialPrice);
  const [isSaving, setIsSaving] = useState(false);

  async function commit() {
    if (value === initialPrice || !value) return;
    setIsSaving(true);
    try {
      await onSave(value);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Input
      className="w-28"
      inputMode="decimal"
      value={value}
      disabled={isSaving}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

/** Gestión de precios por ítem dentro de una lista — tabla editable inline (docs/frontend/06-sprint-f3-catalogo.md §5.5). */
export function PriceListItemsTable({
  companyId,
  priceListId,
  canManage,
}: {
  companyId: string;
  priceListId: string;
  canManage: boolean;
}) {
  const priceListItems = usePriceListItems(companyId, priceListId);
  const items = useItems(companyId, { isActive: true });
  const setPriceListItem = useSetPriceListItem(companyId, priceListId);
  const removePriceListItem = useRemovePriceListItem(companyId, priceListId);

  const [addingItemId, setAddingItemId] = useState('');
  const [addingPrice, setAddingPrice] = useState('');

  if (priceListItems.isLoading || items.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (priceListItems.isError) {
    return (
      <p className="text-sm text-destructive">
        {priceListItems.error instanceof ApiError
          ? priceListItems.error.message
          : 'No se pudieron cargar los precios.'}
      </p>
    );
  }

  const itemById = new Map<string, Item>((items.data ?? []).map((i) => [i.id, i]));
  const rows = priceListItems.data ?? [];
  const availableItems = (items.data ?? []).filter(
    (i) => !rows.some((r) => r.itemId === i.id),
  );

  async function handleSave(itemId: string, price: string) {
    try {
      await setPriceListItem.mutateAsync({ itemId, price });
      toast.success('Precio actualizado');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo actualizar el precio');
    }
  }

  async function handleRemove(itemId: string) {
    try {
      await removePriceListItem.mutateAsync(itemId);
      toast.success('Ítem quitado de la lista');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo quitar el ítem');
    }
  }

  async function handleAdd() {
    if (!addingItemId || !addingPrice) return;
    try {
      await setPriceListItem.mutateAsync({ itemId: addingItemId, price: addingPrice });
      toast.success('Ítem agregado a la lista');
      setAddingItemId('');
      setAddingPrice('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo agregar el ítem');
    }
  }

  return (
    <div className="space-y-3">
      {canManage && availableItems.length > 0 && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-3">
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">Ítem</span>
            <Select value={addingItemId} onValueChange={(v) => v && setAddingItemId(v)}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Elegí un ítem" />
              </SelectTrigger>
              <SelectContent>
                {availableItems.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} ({i.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">Precio</span>
            <Input
              className="w-28"
              inputMode="decimal"
              value={addingPrice}
              onChange={(e) => setAddingPrice(e.target.value)}
            />
          </div>
          <Button onClick={handleAdd} disabled={!addingItemId || !addingPrice}>
            + Agregar
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay precios en esta lista.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ítem</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Precio</TableHead>
                {canManage && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const item = itemById.get(row.itemId);
                return (
                  <TableRow key={row.itemId}>
                    <TableCell>{item?.name ?? row.itemId}</TableCell>
                    <TableCell>{item?.sku ?? '—'}</TableCell>
                    <TableCell>
                      {canManage ? (
                        <PriceCell
                          initialPrice={row.price}
                          onSave={(price) => handleSave(row.itemId, price)}
                        />
                      ) : (
                        row.price
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleRemove(row.itemId)}>
                          Quitar
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
