'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useAllWarehouses } from '@/lib/api/inventory/warehouses';
import { useStock } from '@/lib/api/inventory/stock';
import { useItems, type Item } from '@/lib/api/catalog/items';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { ActiveStatusBadge } from '@/components/shared/status-badge';
import { WarehouseSheet } from '@/components/stock/warehouse-sheet';
import { StockAdjustmentSheet } from '@/components/stock/stock-adjustment-sheet';
import { StockMovementsTable } from '@/components/stock/stock-movements-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function DepositoDetailPage({
  params,
}: {
  params: Promise<{ companyId: string; warehouseId: string }>;
}) {
  const { companyId, warehouseId } = use(params);
  const router = useRouter();
  // No hay GET individual de depósito en el backend salvo bajo
  // branches/:branchId/warehouses/:warehouseId (branchId que acá todavía
  // no conocemos) — se busca en la lista ya cacheada de todos los
  // depósitos, mismo criterio que el detalle de lista de precios (F3).
  const { warehouses, isLoading: warehousesLoading } = useAllWarehouses(companyId);
  const warehouse = warehouses.find((w) => w.id === warehouseId);
  const stock = useStock(companyId, warehouseId);
  const items = useItems(companyId, { isActive: true });
  const { membership } = useCurrentMembership(companyId);
  const canManage = membership ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName) : false;

  const [editOpen, setEditOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  if (warehousesLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (!warehouse) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">Este depósito no existe.</p>
        <Link href={`/${companyId}/stock/depositos`} className="text-sm underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  const itemById = new Map<string, Item>((items.data ?? []).map((i) => [i.id, i]));
  const stockRows = (stock.data ?? []).filter((s) => Number(s.quantity) !== 0);

  return (
    <div className="space-y-4">
      <Link
        href={`/${companyId}/stock/depositos`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Depósitos
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">{warehouse.name}</h1>
          <ActiveStatusBadge isActive={warehouse.isActive} />
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              Editar
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                router.push(`/${companyId}/stock/transferencias?fromWarehouseId=${warehouseId}`)
              }
            >
              Transferir a otro depósito
            </Button>
            <Button onClick={() => setAdjustOpen(true)}>Ajustar stock</Button>
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground">Sucursal: {warehouse.branchName}</p>

      <Card>
        <CardHeader>
          <CardTitle>Stock actual</CardTitle>
        </CardHeader>
        <CardContent>
          {stock.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : stockRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay stock cargado en este depósito.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ítem</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Costo promedio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockRows.map((row) => {
                    const item = itemById.get(row.itemId);
                    return (
                      <TableRow key={row.itemId}>
                        <TableCell>{item?.name ?? row.itemId}</TableCell>
                        <TableCell>{item?.sku ?? '—'}</TableCell>
                        <TableCell className="font-mono">{row.quantity}</TableCell>
                        <TableCell className="font-mono">{row.averageCost}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <StockMovementsTable companyId={companyId} warehouseId={warehouseId} />
        </CardContent>
      </Card>

      <WarehouseSheet
        companyId={companyId}
        open={editOpen}
        onOpenChange={setEditOpen}
        warehouse={warehouse}
      />

      <StockAdjustmentSheet
        companyId={companyId}
        warehouseId={warehouseId}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
      />
    </div>
  );
}
