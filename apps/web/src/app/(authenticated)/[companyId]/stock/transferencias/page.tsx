'use client';

import { useSearchParams } from 'next/navigation';
import { StockTransferForm } from '@/components/stock/stock-transfer-form';

export default function TransferenciasPage({ params }: { params: { companyId: string } }) {
  const searchParams = useSearchParams();
  const fromWarehouseId = searchParams.get('fromWarehouseId') ?? undefined;

  return (
    <StockTransferForm companyId={params.companyId} defaultFromWarehouseId={fromWarehouseId} />
  );
}
