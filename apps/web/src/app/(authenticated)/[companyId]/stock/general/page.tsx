'use client';

import { useCompanyStockOverview } from '@/lib/api/inventory/stock';
import { useAllWarehouses } from '@/lib/api/inventory/warehouses';
import { StockOverviewTable } from '@/components/stock/stock-overview-table';

export default function StockGeneralPage({ params }: { params: { companyId: string } }) {
  const { rows, isLoading } = useCompanyStockOverview(params.companyId);
  const { warehouses } = useAllWarehouses(params.companyId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  return (
    <StockOverviewTable
      companyId={params.companyId}
      rows={rows}
      warehouses={warehouses.filter((w) => w.isActive)}
    />
  );
}
