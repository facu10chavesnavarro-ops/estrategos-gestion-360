'use client';

import { use } from 'react';
import { useCompanyStockOverview } from '@/lib/api/inventory/stock';
import { useAllWarehouses } from '@/lib/api/inventory/warehouses';
import { StockOverviewTable } from '@/components/stock/stock-overview-table';

export default function StockGeneralPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const { rows, isLoading } = useCompanyStockOverview(companyId);
  const { warehouses } = useAllWarehouses(companyId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  return (
    <StockOverviewTable
      companyId={companyId}
      rows={rows}
      warehouses={warehouses.filter((w) => w.isActive)}
    />
  );
}
