'use client';

import { useItemStockAcrossWarehouses } from '@/lib/api/catalog/items';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * Stock actual del ítem, compuesto contra los endpoints ya existentes de
 * inventory (sin pantallas de Stock, que siguen siendo F4 completo) — ver
 * docs/frontend/06-sprint-f3-catalogo.md §3.5.
 */
export function ItemStockPanel({ companyId, itemId }: { companyId: string; itemId: string }) {
  const { rows, isLoading } = useItemStockAcrossWarehouses(companyId, itemId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock actual</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay movimientos de stock.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Depósito</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Costo promedio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.warehouseId}>
                    <TableCell>{row.branchName}</TableCell>
                    <TableCell>{row.warehouseName}</TableCell>
                    <TableCell className="font-mono">{row.quantity}</TableCell>
                    <TableCell className="font-mono">{row.averageCost}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
