'use client';

import { useSearchParams } from 'next/navigation';
import { PaymentForm } from '@/components/tesoreria/payment-form';

export default function NuevoPagoPage({ params }: { params: { companyId: string } }) {
  const searchParams = useSearchParams();
  const partyId = searchParams.get('partyId') ?? undefined;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Nuevo pago</h1>
      <PaymentForm companyId={params.companyId} direction="PAYMENT" defaultPartyId={partyId} />
    </div>
  );
}
