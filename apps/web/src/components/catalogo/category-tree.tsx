'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import {
  type Category,
  useActivateCategory,
  useDeactivateCategory,
} from '@/lib/api/catalog/categories';
import { ApiError } from '@/lib/api/http-client';
import { ActiveStatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ConfirmTarget = { category: Category; action: 'activate' | 'deactivate' };

function CategoryNode({
  category,
  depth,
  canManage,
  onEdit,
  onAddChild,
  onToggleActive,
}: {
  category: Category;
  depth: number;
  canManage: boolean;
  onEdit: (category: Category) => void;
  onAddChild: (parentId: string) => void;
  onToggleActive: (category: Category) => void;
}) {
  return (
    <div>
      <div
        className={cn(
          'flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted',
        )}
        style={{ paddingLeft: `${depth * 1.25 + 0.5}rem` }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{category.name}</span>
          <ActiveStatusBadge isActive={category.isActive} />
        </div>
        {canManage && (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => onAddChild(category.id)}>
              <Plus className="size-3.5" />
              Subcategoría
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit(category)}>
              Editar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onToggleActive(category)}>
              {category.isActive ? 'Desactivar' : 'Activar'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function CategoryTree({
  companyId,
  categories,
  canManage,
  onEdit,
  onAddChild,
}: {
  companyId: string;
  categories: Category[];
  canManage: boolean;
  onEdit: (category: Category) => void;
  onAddChild: (parentId: string) => void;
}) {
  const activateCategory = useActivateCategory(companyId);
  const deactivateCategory = useDeactivateCategory(companyId);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);

  const byParent = new Map<string | null, Category[]>();
  for (const category of categories) {
    const list = byParent.get(category.parentId) ?? [];
    list.push(category);
    byParent.set(category.parentId, list);
  }

  async function handleConfirm() {
    if (!confirmTarget) return;
    try {
      if (confirmTarget.action === 'deactivate') {
        await deactivateCategory.mutateAsync(confirmTarget.category.id);
        toast.success('Categoría desactivada');
      } else {
        await activateCategory.mutateAsync(confirmTarget.category.id);
        toast.success('Categoría activada');
      }
      setConfirmTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo completar la acción');
    }
  }

  function renderLevel(parentId: string | null, depth: number): React.ReactNode {
    const children = byParent.get(parentId) ?? [];
    if (children.length === 0) return null;
    return children.map((category) => (
      <div key={category.id}>
        <CategoryNode
          category={category}
          depth={depth}
          canManage={canManage}
          onEdit={onEdit}
          onAddChild={onAddChild}
          onToggleActive={(c) =>
            setConfirmTarget({ category: c, action: c.isActive ? 'deactivate' : 'activate' })
          }
        />
        {renderLevel(category.id, depth + 1)}
      </div>
    ));
  }

  if (categories.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay categorías.</p>;
  }

  return (
    <>
      <div className="rounded-lg border border-border p-2">{renderLevel(null, 0)}</div>

      {confirmTarget && (
        <ConfirmDialog
          open={Boolean(confirmTarget)}
          onOpenChange={(open) => !open && setConfirmTarget(null)}
          title={confirmTarget.action === 'deactivate' ? 'Desactivar categoría' : 'Activar categoría'}
          description={`¿Confirmás ${confirmTarget.action === 'deactivate' ? 'desactivar' : 'activar'} "${confirmTarget.category.name}"?`}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}
