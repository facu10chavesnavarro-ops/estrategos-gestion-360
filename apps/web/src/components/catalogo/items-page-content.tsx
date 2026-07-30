'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { useItems, useImportItems, exportItemsCsv, type Item, type ItemType } from '@/lib/api/catalog/items';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { ApiError } from '@/lib/api/http-client';
import { ItemsTable } from '@/components/catalogo/items-table';
import { ItemSheet } from '@/components/catalogo/item-sheet';
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

/**
 * Contenido compartido de Productos y Servicios — misma pantalla filtrada
 * por `type` (docs/frontend/06-sprint-f3-catalogo.md §3.2), no dos
 * componentes casi idénticos.
 */
export function ItemsPageContent({ companyId, type }: { companyId: string; type: ItemType }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = (searchParams.get('status') as StatusFilter | null) ?? 'all';
  const basePath = type === 'PRODUCT' ? 'productos' : 'servicios';
  const entityLabel = type === 'PRODUCT' ? 'productos' : 'servicios';

  const { membership, isLoading: membershipLoading } = useCurrentMembership(companyId);
  const canManage =
    !membershipLoading && membership
      ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName)
      : false;

  const items = useItems(companyId, { type, isActive: STATUS_TO_IS_ACTIVE[status] });
  const importItems = useImportItems(companyId);

  const [sheetTarget, setSheetTarget] = useState<{ open: boolean; item?: Item }>({ open: false });
  const [isExporting, setIsExporting] = useState(false);

  function setStatus(next: StatusFilter) {
    const qs = new URLSearchParams(searchParams.toString());
    if (next === 'all') qs.delete('status');
    else qs.set('status', next);
    router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportItemsCsv(companyId, { type, isActive: STATUS_TO_IS_ACTIVE[status] });
    } catch {
      toast.error('No se pudo exportar el catálogo.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">{type === 'PRODUCT' ? 'Productos' : 'Servicios'}</h1>
      </div>

      {items.isLoading || membershipLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : items.isError ? (
        <div className="space-y-3">
          <p className="text-sm text-destructive">
            {items.error instanceof ApiError ? items.error.message : 'No se pudieron cargar los ítems.'}
          </p>
          <Button variant="outline" onClick={() => items.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <ItemsTable
          companyId={companyId}
          basePath={basePath}
          items={items.data ?? []}
          canManage={canManage}
          onEdit={(item) => setSheetTarget({ open: true, item })}
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
              <Button variant="outline" onClick={handleExport} disabled={isExporting}>
                {isExporting ? 'Exportando…' : 'Exportar CSV'}
              </Button>
              {canManage && (
                <>
                  <ImportDialog entityLabel={entityLabel} onImport={importItems.mutateAsync} />
                  <Button onClick={() => setSheetTarget({ open: true, item: undefined })}>
                    + Nuevo {type === 'PRODUCT' ? 'producto' : 'servicio'}
                  </Button>
                </>
              )}
            </div>
          }
        />
      )}

      <ItemSheet
        companyId={companyId}
        type={type}
        open={sheetTarget.open}
        onOpenChange={(open) => setSheetTarget((s) => ({ ...s, open }))}
        item={sheetTarget.item}
      />
    </div>
  );
}
