'use client';

import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { StockTransferForm } from '@/components/stock/stock-transfer-form';

export default function TransferenciasPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const searchParams = useSearchParams();
  const fromWarehouseId = searchParams.get('fromWarehouseId') ?? undefined;

  return <StockTransferForm companyId={companyId} defaultFromWarehouseId={fromWarehouseId} />;
}
