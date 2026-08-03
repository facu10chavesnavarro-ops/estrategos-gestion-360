'use client';

import { useState } from 'react';
import { useAllPointsOfSale, type PointOfSaleWithBranch } from '@/lib/api/vouchers/point-of-sale';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { PointsOfSaleTable } from '@/components/comprobantes/points-of-sale-table';
import { PointOfSaleSheet } from '@/components/comprobantes/point-of-sale-sheet';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type StatusFilter = 'all' | 'active' | 'inactive';

export default function PuntosDeVentaPage({ params }: { params: { companyId: string } }) {
  const { pointsOfSale, isLoading } = useAllPointsOfSale(params.companyId);
  const { membership, isLoading: membershipLoading } = useCurrentMembership(params.companyId);
  const canManage =
    !membershipLoading && membership
      ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName)
      : false;

  const [status, setStatus] = useState<StatusFilter>('all');
  const [sheetTarget, setSheetTarget] = useState<{ open: boolean; pointOfSale?: PointOfSaleWithBranch }>({
    open: false,
  });

  const filtered = pointsOfSale.filter((p) => {
    if (status === 'active') return p.isActive;
    if (status === 'inactive') return !p.isActive;
    return true;
  });

  if (isLoading || membershipLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  return (
    <div className="space-y-4">
      <PointsOfSaleTable
        companyId={params.companyId}
        pointsOfSale={filtered}
        canManage={canManage}
        onEdit={(pointOfSale) => setSheetTarget({ open: true, pointOfSale })}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onValueChange={(v) => v && setStatus(v as StatusFilter)}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
            {canManage && (
              <Button onClick={() => setSheetTarget({ open: true, pointOfSale: undefined })}>
                + Nuevo punto de venta
              </Button>
            )}
          </div>
        }
      />

      <PointOfSaleSheet
        companyId={params.companyId}
        open={sheetTarget.open}
        onOpenChange={(open) => setSheetTarget((s) => ({ ...s, open }))}
        pointOfSale={sheetTarget.pointOfSale}
      />
    </div>
  );
}
