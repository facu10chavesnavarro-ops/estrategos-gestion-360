'use client';

import { use } from 'react';
import { VoucherForm } from '@/components/comprobantes/voucher-form';

export default function NuevaFacturaCompraPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Nueva Factura de Compra</h1>
      <VoucherForm companyId={companyId} flow="PURCHASE" />
    </div>
  );
}
