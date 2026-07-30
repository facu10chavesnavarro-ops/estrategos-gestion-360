'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { usePriceLists } from '@/lib/api/catalog/price-lists';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { ActiveStatusBadge } from '@/components/shared/status-badge';
import { PriceListItemsTable } from '@/components/catalogo/price-list-items-table';

export default function PriceListDetailPage({
  params,
}: {
  params: { companyId: string; priceListId: string };
}) {
  // No hay GET individual de lista de precios en el backend — se busca en
  // el listado ya cacheado (mismo criterio que evitar una llamada extra
  // cuando el dato ya está disponible).
  const priceLists = usePriceLists(params.companyId);
  const { membership } = useCurrentMembership(params.companyId);
  const canManage = membership ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName) : false;

  const priceList = priceLists.data?.find((p) => p.id === params.priceListId);

  if (priceLists.isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Cargando…</p>;
  }

  if (!priceList) {
    return (
      <div className="space-y-3 p-6">
        <p className="text-sm text-destructive">Esta lista de precios no existe.</p>
        <Link href={`/${params.companyId}/catalogo/listas-de-precio`} className="text-sm underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <Link
        href={`/${params.companyId}/catalogo/listas-de-precio`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Listas de precio
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">{priceList.name}</h1>
        <ActiveStatusBadge isActive={priceList.isActive} />
      </div>
      <p className="text-sm text-muted-foreground">
        Moneda: {priceList.currency}
        {priceList.isDefault && ' · Predeterminada'}
      </p>

      <PriceListItemsTable
        companyId={params.companyId}
        priceListId={params.priceListId}
        canManage={canManage}
      />
    </div>
  );
}
