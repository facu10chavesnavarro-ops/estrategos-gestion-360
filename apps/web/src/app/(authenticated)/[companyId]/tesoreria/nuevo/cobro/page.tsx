'use client';

import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { PaymentForm } from '@/components/tesoreria/payment-form';

export default function NuevoCobroPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const searchParams = useSearchParams();
  const partyId = searchParams.get('partyId') ?? undefined;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Nuevo cobro</h1>
      <PaymentForm companyId={companyId} direction="COLLECTION" defaultPartyId={partyId} />
    </div>
  );
}
