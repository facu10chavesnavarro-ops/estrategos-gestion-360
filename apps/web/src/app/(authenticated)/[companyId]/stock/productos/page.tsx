'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useItems } from '@/lib/api/catalog/items';
import { ItemStockPanel } from '@/components/catalogo/item-stock-panel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** Stock por producto (F4 §5.2): elegir un ítem que controla stock y ver
 * su detalle en todos los depósitos — reutiliza ItemStockPanel de F3. */
export default function StockPorProductoPage({ params }: { params: { companyId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = searchParams.get('itemId') ?? '';

  const items = useItems(params.companyId, { type: 'PRODUCT', isActive: true });
  const stockItems = (items.data ?? []).filter((i) => i.tracksStock);
  const selected = stockItems.find((i) => i.id === itemId);

  function selectItem(id: string) {
    const qs = new URLSearchParams(searchParams.toString());
    qs.set('itemId', id);
    router.replace(`?${qs.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <Select value={itemId} onValueChange={(v) => v && selectItem(v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Elegí un producto" />
          </SelectTrigger>
          <SelectContent>
            {stockItems.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                {i.name} ({i.sku})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selected ? (
        <p className="text-sm text-muted-foreground">Elegí un producto para ver su stock.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{selected.name}</h2>
            <Link
              href={`/${params.companyId}/catalogo/productos/${selected.id}`}
              className="text-sm underline"
            >
              Ver ficha del producto
            </Link>
          </div>
          <ItemStockPanel companyId={params.companyId} itemId={selected.id} />
        </div>
      )}
    </div>
  );
}
