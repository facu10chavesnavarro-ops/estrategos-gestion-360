'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useItem, type ItemType } from '@/lib/api/catalog/items';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { ApiError } from '@/lib/api/http-client';
import { ItemSheet } from '@/components/catalogo/item-sheet';
import { ItemStockPanel } from '@/components/catalogo/item-stock-panel';
import { ActiveStatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value ?? '—'}</p>
    </div>
  );
}

export function ItemDetailContent({
  companyId,
  itemId,
  type,
}: {
  companyId: string;
  itemId: string;
  type: ItemType;
}) {
  const basePath = type === 'PRODUCT' ? 'productos' : 'servicios';
  const item = useItem(companyId, itemId);
  const { membership } = useCurrentMembership(companyId);
  const canManage = membership ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName) : false;
  const [editOpen, setEditOpen] = useState(false);

  if (item.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (item.isError || !item.data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">
          {item.error instanceof ApiError ? item.error.message : 'No se pudo cargar el ítem.'}
        </p>
        <Link href={`/${companyId}/catalogo/${basePath}`} className="text-sm underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  const data = item.data;

  return (
    <div className="space-y-4">
      <Link
        href={`/${companyId}/catalogo/${basePath}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {type === 'PRODUCT' ? 'Productos' : 'Servicios'}
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">{data.name}</h1>
          <ActiveStatusBadge isActive={data.isActive} />
        </div>
        {canManage && <Button onClick={() => setEditOpen(true)}>Editar</Button>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="SKU" value={data.sku} />
          <Field label="Código de barras" value={data.barcode} />
          <Field label="Unidad de medida" value={data.unitOfMeasure} />
          <Field label="Costo" value={data.costPrice} />
          <Field label="Controla stock" value={data.tracksStock ? 'Sí' : 'No'} />
          <Field label="Stock mínimo" value={data.minimumStock} />
          <div className="sm:col-span-3">
            <Field label="Descripción corta" value={data.description} />
          </div>
          <div className="sm:col-span-3">
            <Field label="Descripción larga" value={data.longDescription} />
          </div>
        </CardContent>
      </Card>

      {data.tracksStock && <ItemStockPanel companyId={companyId} itemId={data.id} />}

      <ItemSheet
        companyId={companyId}
        type={type}
        open={editOpen}
        onOpenChange={setEditOpen}
        item={data}
      />
    </div>
  );
}
