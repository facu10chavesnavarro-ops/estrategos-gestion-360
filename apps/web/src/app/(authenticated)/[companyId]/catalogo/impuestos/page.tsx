'use client';

import { useState } from 'react';
import { useTaxes, type Tax } from '@/lib/api/catalog/taxes';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { ApiError } from '@/lib/api/http-client';
import { TaxesTable } from '@/components/catalogo/taxes-table';
import { TaxSheet } from '@/components/catalogo/tax-sheet';
import { Button } from '@/components/ui/button';

export default function ImpuestosPage({ params }: { params: { companyId: string } }) {
  const taxes = useTaxes(params.companyId);
  const { membership, isLoading: membershipLoading } = useCurrentMembership(params.companyId);
  const canManage =
    !membershipLoading && membership
      ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName)
      : false;

  const [sheetTarget, setSheetTarget] = useState<{ open: boolean; tax?: Tax }>({ open: false });

  if (taxes.isLoading || membershipLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (taxes.isError) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">
          {taxes.error instanceof ApiError ? taxes.error.message : 'No se pudieron cargar los impuestos.'}
        </p>
        <Button variant="outline" onClick={() => taxes.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TaxesTable
        companyId={params.companyId}
        taxes={taxes.data ?? []}
        canManage={canManage}
        onEdit={(tax) => setSheetTarget({ open: true, tax })}
        toolbar={
          canManage ? (
            <Button onClick={() => setSheetTarget({ open: true, tax: undefined })}>
              + Nuevo impuesto
            </Button>
          ) : undefined
        }
      />

      <TaxSheet
        companyId={params.companyId}
        open={sheetTarget.open}
        onOpenChange={(open) => setSheetTarget((s) => ({ ...s, open }))}
        tax={sheetTarget.tax}
      />
    </div>
  );
}
