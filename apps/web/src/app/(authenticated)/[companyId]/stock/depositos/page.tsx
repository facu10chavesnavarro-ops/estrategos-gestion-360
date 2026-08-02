'use client';

import { useState } from 'react';
import { useAllWarehouses, type WarehouseWithBranch } from '@/lib/api/inventory/warehouses';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { WarehousesTable } from '@/components/stock/warehouses-table';
import { WarehouseSheet } from '@/components/stock/warehouse-sheet';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type StatusFilter = 'all' | 'active' | 'inactive';

export default function DepositosPage({ params }: { params: { companyId: string } }) {
  const { warehouses, isLoading } = useAllWarehouses(params.companyId);
  const { membership, isLoading: membershipLoading } = useCurrentMembership(params.companyId);
  const canManage =
    !membershipLoading && membership
      ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName)
      : false;

  const [status, setStatus] = useState<StatusFilter>('all');
  const [sheetTarget, setSheetTarget] = useState<{ open: boolean; warehouse?: WarehouseWithBranch }>({
    open: false,
  });

  const filtered = warehouses.filter((w) => {
    if (status === 'active') return w.isActive;
    if (status === 'inactive') return !w.isActive;
    return true;
  });

  if (isLoading || membershipLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  return (
    <div className="space-y-4">
      <WarehousesTable
        companyId={params.companyId}
        warehouses={filtered}
        canManage={canManage}
        onEdit={(warehouse) => setSheetTarget({ open: true, warehouse })}
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
              <Button onClick={() => setSheetTarget({ open: true, warehouse: undefined })}>
                + Nuevo depósito
              </Button>
            )}
          </div>
        }
      />

      <WarehouseSheet
        companyId={params.companyId}
        open={sheetTarget.open}
        onOpenChange={(open) => setSheetTarget((s) => ({ ...s, open }))}
        warehouse={sheetTarget.warehouse}
      />
    </div>
  );
}
