'use client';

import { useState } from 'react';
import { useCategories, type Category } from '@/lib/api/catalog/categories';
import { useCurrentMembership, ROLES_THAT_CAN_MANAGE_COMPANY } from '@/lib/api/users';
import { ApiError } from '@/lib/api/http-client';
import { CategoryTree } from '@/components/catalogo/category-tree';
import { CategorySheet } from '@/components/catalogo/category-sheet';
import { Button } from '@/components/ui/button';

export default function CategoriasPage({ params }: { params: { companyId: string } }) {
  const categories = useCategories(params.companyId);
  const { membership, isLoading: membershipLoading } = useCurrentMembership(params.companyId);
  const canManage =
    !membershipLoading && membership
      ? ROLES_THAT_CAN_MANAGE_COMPANY.includes(membership.roleName)
      : false;

  const [sheetTarget, setSheetTarget] = useState<{
    open: boolean;
    category?: Category;
    defaultParentId?: string;
  }>({ open: false });

  if (categories.isLoading || membershipLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (categories.isError) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">
          {categories.error instanceof ApiError
            ? categories.error.message
            : 'No se pudieron cargar las categorías.'}
        </p>
        <Button variant="outline" onClick={() => categories.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setSheetTarget({ open: true })}>+ Nueva categoría</Button>
        </div>
      )}

      <CategoryTree
        companyId={params.companyId}
        categories={categories.data ?? []}
        canManage={canManage}
        onEdit={(category) => setSheetTarget({ open: true, category })}
        onAddChild={(parentId) => setSheetTarget({ open: true, defaultParentId: parentId })}
      />

      <CategorySheet
        companyId={params.companyId}
        open={sheetTarget.open}
        onOpenChange={(open) => setSheetTarget((s) => ({ ...s, open }))}
        categories={categories.data ?? []}
        category={sheetTarget.category}
        defaultParentId={sheetTarget.defaultParentId}
      />
    </div>
  );
}
