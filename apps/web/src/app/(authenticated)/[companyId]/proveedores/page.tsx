'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useSuppliers, useImportSuppliers, type Supplier } from '@/lib/api/suppliers';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { ApiError } from '@/lib/api/http-client';
import { SuppliersTable } from '@/components/proveedores/suppliers-table';
import { SupplierSheet } from '@/components/proveedores/supplier-sheet';
import { ImportDialog } from '@/components/parties/import-dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type StatusFilter = 'all' | 'active' | 'inactive';

const STATUS_TO_IS_ACTIVE: Record<StatusFilter, boolean | undefined> = {
  all: undefined,
  active: true,
  inactive: false,
};

export default function ProveedoresPage({ params }: { params: { companyId: string } }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = (searchParams.get('status') as StatusFilter | null) ?? 'all';

  const { membership, isLoading: membershipLoading } = useCurrentMembership(params.companyId);
  const canManage =
    !membershipLoading && membership
      ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName)
      : false;

  const suppliers = useSuppliers(params.companyId, { isActive: STATUS_TO_IS_ACTIVE[status] });
  const importSuppliers = useImportSuppliers(params.companyId);

  const [sheetTarget, setSheetTarget] = useState<{ open: boolean; supplier?: Supplier }>({
    open: false,
  });

  function setStatus(next: StatusFilter) {
    const qs = new URLSearchParams(searchParams.toString());
    if (next === 'all') qs.delete('status');
    else qs.set('status', next);
    router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Proveedores</h1>
      </div>

      {suppliers.isLoading || membershipLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : suppliers.isError ? (
        <div className="space-y-3">
          <p className="text-sm text-destructive">
            {suppliers.error instanceof ApiError
              ? suppliers.error.message
              : 'No se pudieron cargar los proveedores.'}
          </p>
          <Button variant="outline" onClick={() => suppliers.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <SuppliersTable
          companyId={params.companyId}
          suppliers={suppliers.data ?? []}
          canManage={canManage}
          onEdit={(supplier) => setSheetTarget({ open: true, supplier })}
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
                <>
                  <ImportDialog entityLabel="proveedores" onImport={importSuppliers.mutateAsync} />
                  <Button onClick={() => setSheetTarget({ open: true, supplier: undefined })}>
                    + Nuevo proveedor
                  </Button>
                </>
              )}
            </div>
          }
        />
      )}

      <SupplierSheet
        companyId={params.companyId}
        open={sheetTarget.open}
        onOpenChange={(open) => setSheetTarget((s) => ({ ...s, open }))}
        supplier={sheetTarget.supplier}
      />
    </div>
  );
}
