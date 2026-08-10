'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Plus, Lock } from 'lucide-react';
import {
  type ChartOfAccount,
  type AccountType,
  useActivateChartOfAccount,
  useDeactivateChartOfAccount,
} from '@/lib/api/accounting/chart-of-accounts';
import { ApiError } from '@/lib/api/http-client';
import { ActiveStatusBadge, StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TYPE_LABELS: Record<AccountType, string> = {
  ASSET: 'Activo',
  LIABILITY: 'Pasivo',
  EQUITY: 'Patrimonio Neto',
  INCOME: 'Ingreso',
  EXPENSE: 'Egreso',
};

type ConfirmTarget = { account: ChartOfAccount; action: 'activate' | 'deactivate' };

function AccountRow({
  companyId,
  account,
  depth,
  parentType,
  canManage,
  onEdit,
  onAddChild,
  onToggleActive,
}: {
  companyId: string;
  account: ChartOfAccount;
  depth: number;
  parentType?: AccountType;
  canManage: boolean;
  onEdit: (account: ChartOfAccount) => void;
  onAddChild: (parentId: string) => void;
  onToggleActive: (account: ChartOfAccount) => void;
}) {
  const typeMismatch = parentType !== undefined && parentType !== account.type;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
      style={{ paddingLeft: `${depth * 1.25 + 0.5}rem` }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/${companyId}/contabilidad/plan-de-cuentas/${account.id}`}
          className="font-mono text-sm hover:underline"
        >
          {account.code}
        </Link>
        <span className="text-sm">{account.name}</span>
        <StatusBadge
          label={TYPE_LABELS[account.type]}
          tone={typeMismatch ? 'warning' : 'neutral'}
        />
        <StatusBadge
          label={account.allowsMovements ? 'Imputable' : 'Agrupadora'}
          tone={account.allowsMovements ? 'active' : 'neutral'}
        />
        {account.isSystemAccount && (
          <span title="Cuenta del sistema, no se puede desactivar">
            <Lock className="size-3.5 text-muted-foreground" />
          </span>
        )}
        <ActiveStatusBadge isActive={account.isActive} />
      </div>
      {canManage && (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onAddChild(account.id)}>
            <Plus className="size-3.5" />
            Subcuenta
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(account)}>
            Editar
          </Button>
          {!account.isSystemAccount && (
            <Button variant="ghost" size="sm" onClick={() => onToggleActive(account)}>
              {account.isActive ? 'Desactivar' : 'Activar'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Árbol del Plan de Cuentas armado en el cliente (§3.4,
 * docs/frontend/11-sprint-f8-contabilidad.md) — el backend solo
 * devuelve una lista plana. El badge de tipo se marca en tono
 * "warning" cuando difiere del tipo de su padre — el backend no
 * valida esa consistencia (§3.5), es solo una advertencia visual, no
 * un bloqueo.
 */
export function ChartOfAccountsTree({
  companyId,
  accounts,
  canManage,
  onEdit,
  onAddChild,
}: {
  companyId: string;
  accounts: ChartOfAccount[];
  canManage: boolean;
  onEdit: (account: ChartOfAccount) => void;
  onAddChild: (parentId: string) => void;
}) {
  const activateAccount = useActivateChartOfAccount(companyId);
  const deactivateAccount = useDeactivateChartOfAccount(companyId);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [search, setSearch] = useState('');

  const byId = new Map(accounts.map((a) => [a.id, a]));
  const byParent = new Map<string | null, ChartOfAccount[]>();
  for (const account of accounts) {
    const list = byParent.get(account.parentId) ?? [];
    list.push(account);
    byParent.set(account.parentId, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.code.localeCompare(b.code));
  }

  async function handleConfirm() {
    if (!confirmTarget) return;
    try {
      if (confirmTarget.action === 'deactivate') {
        await deactivateAccount.mutateAsync(confirmTarget.account.id);
        toast.success('Cuenta desactivada');
      } else {
        await activateAccount.mutateAsync(confirmTarget.account.id);
        toast.success('Cuenta activada');
      }
      setConfirmTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo completar la acción');
    }
  }

  function renderLevel(parentId: string | null, depth: number): React.ReactNode {
    const children = byParent.get(parentId) ?? [];
    if (children.length === 0) return null;
    const parentType = parentId ? byId.get(parentId)?.type : undefined;
    return children.map((account) => (
      <div key={account.id}>
        <AccountRow
          companyId={companyId}
          account={account}
          depth={depth}
          parentType={parentType}
          canManage={canManage}
          onEdit={onEdit}
          onAddChild={onAddChild}
          onToggleActive={(a) =>
            setConfirmTarget({ account: a, action: a.isActive ? 'deactivate' : 'activate' })
          }
        />
        {renderLevel(account.id, depth + 1)}
      </div>
    ));
  }

  const query = search.trim().toLowerCase();
  const filtered = query
    ? accounts.filter(
        (a) => a.code.toLowerCase().includes(query) || a.name.toLowerCase().includes(query),
      )
    : null;

  if (accounts.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay cuentas.</p>;
  }

  return (
    <>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por código o nombre..."
        className={cn(
          'mb-2 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-xs',
          'placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
        )}
      />

      {filtered ? (
        <div className="rounded-lg border border-border p-2">
          {filtered.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">Sin resultados.</p>
          ) : (
            filtered.map((account) => (
              <AccountRow
                key={account.id}
                companyId={companyId}
                account={account}
                depth={0}
                canManage={canManage}
                onEdit={onEdit}
                onAddChild={onAddChild}
                onToggleActive={(a) =>
                  setConfirmTarget({ account: a, action: a.isActive ? 'deactivate' : 'activate' })
                }
              />
            ))
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border p-2">{renderLevel(null, 0)}</div>
      )}

      {confirmTarget && (
        <ConfirmDialog
          open={Boolean(confirmTarget)}
          onOpenChange={(open) => !open && setConfirmTarget(null)}
          title={confirmTarget.action === 'deactivate' ? 'Desactivar cuenta' : 'Activar cuenta'}
          description={`¿Confirmás ${confirmTarget.action === 'deactivate' ? 'desactivar' : 'activar'} "${confirmTarget.account.code} — ${confirmTarget.account.name}"?`}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}
