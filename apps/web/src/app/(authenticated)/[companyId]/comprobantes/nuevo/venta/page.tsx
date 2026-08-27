'use client';

import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { VoucherForm } from '@/components/comprobantes/voucher-form';

export default function NuevaFacturaVentaPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const searchParams = useSearchParams();
  const relatedVoucherId = searchParams.get('relatedVoucherId') ?? undefined;
  const partyId = searchParams.get('partyId') ?? undefined;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Nueva Factura de Venta</h1>
      <VoucherForm
        companyId={companyId}
        flow="SALE"
        defaultPartyId={partyId}
        defaultRelatedVoucherId={relatedVoucherId}
      />
    </div>
  );
}
