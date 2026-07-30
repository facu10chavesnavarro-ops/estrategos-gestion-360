'use client';

import { useState } from 'react';
import { usePriceLists, type PriceList } from '@/lib/api/catalog/price-lists';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { ApiError } from '@/lib/api/http-client';
import { PriceListsTable } from '@/components/catalogo/price-lists-table';
import { PriceListSheet } from '@/components/catalogo/price-list-sheet';
import { Button } from '@/components/ui/button';

export default function ListasDePrecioPage({ params }: { params: { companyId: string } }) {
  const priceLists = usePriceLists(params.companyId);
  const { membership, isLoading: membershipLoading } = useCurrentMembership(params.companyId);
  const canManage =
    !membershipLoading && membership
      ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName)
      : false;

  const [sheetTarget, setSheetTarget] = useState<{ open: boolean; priceList?: PriceList }>({
    open: false,
  });

  if (priceLists.isLoading || membershipLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (priceLists.isError) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">
          {priceLists.error instanceof ApiError
            ? priceLists.error.message
            : 'No se pudieron cargar las listas de precio.'}
        </p>
        <Button variant="outline" onClick={() => priceLists.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PriceListsTable
        companyId={params.companyId}
        priceLists={priceLists.data ?? []}
        canManage={canManage}
        onEdit={(priceList) => setSheetTarget({ open: true, priceList })}
        toolbar={
          canManage ? (
            <Button onClick={() => setSheetTarget({ open: true, priceList: undefined })}>
              + Nueva lista de precios
            </Button>
          ) : undefined
        }
      />

      <PriceListSheet
        companyId={params.companyId}
        open={sheetTarget.open}
        onOpenChange={(open) => setSheetTarget((s) => ({ ...s, open }))}
        priceList={sheetTarget.priceList}
      />
    </div>
  );
}
