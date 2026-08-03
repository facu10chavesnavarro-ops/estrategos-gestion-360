'use client';

import { VoucherForm } from '@/components/comprobantes/voucher-form';

export default function NuevaFacturaCompraPage({ params }: { params: { companyId: string } }) {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Nueva Factura de Compra</h1>
      <VoucherForm companyId={params.companyId} flow="PURCHASE" />
    </div>
  );
}
