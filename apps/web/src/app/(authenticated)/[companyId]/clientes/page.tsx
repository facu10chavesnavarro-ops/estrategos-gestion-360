'use client';

import { use, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCustomers, useImportCustomers, type Customer } from '@/lib/api/customers';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { ApiError } from '@/lib/api/http-client';
import { CustomersTable } from '@/components/clientes/customers-table';
import { CustomerSheet } from '@/components/clientes/customer-sheet';
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

export default function ClientesPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = (searchParams.get('status') as StatusFilter | null) ?? 'all';

  const { membership, isLoading: membershipLoading } = useCurrentMembership(companyId);
  const canManage =
    !membershipLoading && membership
      ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName)
      : false;

  const customers = useCustomers(companyId, { isActive: STATUS_TO_IS_ACTIVE[status] });
  const importCustomers = useImportCustomers(companyId);

  const [sheetTarget, setSheetTarget] = useState<{ open: boolean; customer?: Customer }>({
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
        <h1 className="text-lg font-semibold">Clientes</h1>
      </div>

      {customers.isLoading || membershipLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : customers.isError ? (
        <div className="space-y-3">
          <p className="text-sm text-destructive">
            {customers.error instanceof ApiError
              ? customers.error.message
              : 'No se pudieron cargar los clientes.'}
          </p>
          <Button variant="outline" onClick={() => customers.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <CustomersTable
          companyId={companyId}
          customers={customers.data ?? []}
          canManage={canManage}
          onEdit={(customer) => setSheetTarget({ open: true, customer })}
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
                  <ImportDialog entityLabel="clientes" onImport={importCustomers.mutateAsync} />
                  <Button onClick={() => setSheetTarget({ open: true, customer: undefined })}>
                    + Nuevo cliente
                  </Button>
                </>
              )}
            </div>
          }
        />
      )}

      <CustomerSheet
        companyId={companyId}
        open={sheetTarget.open}
        onOpenChange={(open) => setSheetTarget((s) => ({ ...s, open }))}
        customer={sheetTarget.customer}
      />
    </div>
  );
}
