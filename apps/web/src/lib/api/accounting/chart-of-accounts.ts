import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../http-client';
import { queryKeys } from '../query-keys';

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';

/**
 * Jerárquica vía `parentId` (autorreferencial, igual patrón que
 * `Category` de F3). `allowsMovements=true` = cuenta imputable, puede
 * recibir líneas de asiento; `false` = agrupadora, solo de
 * presentación. `isSystemAccount=true` protege de la desactivación
 * (RN-ACC-02) — no puede desactivarse desde acá.
 */
export interface ChartOfAccount {
  id: string;
  companyId: string;
  parentId: string | null;
  code: string;
  name: string;
  type: AccountType;
  allowsMovements: boolean;
  isSystemAccount: boolean;
  isActive: boolean;
}

export interface CreateChartOfAccountInput {
  parentId?: string;
  code: string;
  name: string;
  type: AccountType;
  allowsMovements?: boolean;
}

/** Solo `parentId`/`name` son editables — `code`/`type`/`allowsMovements` son inmutables tras crear. */
export interface UpdateChartOfAccountInput {
  parentId?: string | null;
  name?: string;
}

/** Un movimiento del Libro Mayor — `runningBalance` ya viene calculado por el backend (§2.2). */
export interface AccountLedgerMovement {
  journalEntryId: string;
  date: string;
  description: string;
  debit: string;
  credit: string;
  runningBalance: string;
}

export interface AccountLedger {
  account: ChartOfAccount;
  movements: AccountLedgerMovement[];
}

export function useChartOfAccounts(companyId: string, isActive?: boolean) {
  return useQuery({
    queryKey: queryKeys.accounting.chartOfAccounts(companyId, isActive),
    queryFn: () => {
      const qs = isActive === undefined ? '' : `?isActive=${isActive}`;
      return apiFetch<ChartOfAccount[]>(`companies/${companyId}/chart-of-accounts${qs}`, companyId);
    },
    enabled: Boolean(companyId),
  });
}

export function useChartOfAccount(companyId: string, accountId: string) {
  return useQuery({
    queryKey: queryKeys.accounting.accountDetail(companyId, accountId),
    queryFn: () =>
      apiFetch<ChartOfAccount>(`companies/${companyId}/chart-of-accounts/${accountId}`, companyId),
    enabled: Boolean(companyId) && Boolean(accountId),
  });
}

export function useAccountLedger(companyId: string, accountId: string) {
  return useQuery({
    queryKey: queryKeys.accounting.accountLedger(companyId, accountId),
    queryFn: () =>
      apiFetch<AccountLedger>(`companies/${companyId}/chart-of-accounts/${accountId}/ledger`, companyId),
    enabled: Boolean(companyId) && Boolean(accountId),
  });
}

function invalidateChartOfAccountsQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string,
) {
  queryClient.invalidateQueries({ queryKey: ['companies', companyId, 'chart-of-accounts'] });
}

export function useCreateChartOfAccount(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateChartOfAccountInput) =>
      apiFetch<ChartOfAccount>(`companies/${companyId}/chart-of-accounts`, companyId, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateChartOfAccountsQueries(queryClient, companyId),
  });
}

export function useUpdateChartOfAccount(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, input }: { accountId: string; input: UpdateChartOfAccountInput }) =>
      apiFetch<ChartOfAccount>(`companies/${companyId}/chart-of-accounts/${accountId}`, companyId, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateChartOfAccountsQueries(queryClient, companyId),
  });
}

function useChartOfAccountStatusMutation(companyId: string, action: 'activate' | 'deactivate') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (accountId: string) =>
      apiFetch<ChartOfAccount>(
        `companies/${companyId}/chart-of-accounts/${accountId}/${action}`,
        companyId,
        { method: 'POST' },
      ),
    onSuccess: () => invalidateChartOfAccountsQueries(queryClient, companyId),
  });
}

export function useActivateChartOfAccount(companyId: string) {
  return useChartOfAccountStatusMutation(companyId, 'activate');
}

export function useDeactivateChartOfAccount(companyId: string) {
  return useChartOfAccountStatusMutation(companyId, 'deactivate');
}

/** Cuentas imputables y activas — las únicas que pueden recibir líneas de asiento o mapeos (§3.4/§3.8/§3.9/§3.10). */
export function useImputableActiveAccounts(companyId: string): ChartOfAccount[] {
  const accounts = useChartOfAccounts(companyId, true);
  return (accounts.data ?? []).filter((a) => a.allowsMovements);
}

/**
 * Arma el árbol jerárquico a partir de la lista plana + `parentId` —
 * el backend no lo devuelve armado (§3.4). Mismo patrón que
 * `category-tree.tsx` (F3).
 */
export interface ChartOfAccountTreeNode extends ChartOfAccount {
  depth: number;
}

export function buildChartOfAccountsTree(accounts: ChartOfAccount[]): ChartOfAccountTreeNode[] {
  const byParent = new Map<string | null, ChartOfAccount[]>();
  for (const account of accounts) {
    const list = byParent.get(account.parentId) ?? [];
    list.push(account);
    byParent.set(account.parentId, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.code.localeCompare(b.code));
  }

  const nodes: ChartOfAccountTreeNode[] = [];
  function walk(parentId: string | null, depth: number) {
    for (const account of byParent.get(parentId) ?? []) {
      nodes.push({ ...account, depth });
      walk(account.id, depth + 1);
    }
  }
  walk(null, 0);
  return nodes;
}

/** Ids a excluir del selector de padre: la propia cuenta + todos sus descendientes (evita un ciclo, RN-ACC / `AccountCycleError`). */
export function collectExcludedAccountIds(accounts: ChartOfAccount[], rootId: string): Set<string> {
  const excluded = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const account of accounts) {
      if (account.parentId && excluded.has(account.parentId) && !excluded.has(account.id)) {
        excluded.add(account.id);
        changed = true;
      }
    }
  }
  return excluded;
}
