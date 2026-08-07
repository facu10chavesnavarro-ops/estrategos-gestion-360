import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../http-client';
import { queryKeys } from '../query-keys';
import { useBranches } from '../companies';

export interface CashRegister {
  id: string;
  companyId: string;
  branchId: string;
  name: string;
  isActive: boolean;
  accountId: string | null;
}

export interface CashRegisterWithBranch extends CashRegister {
  branchName: string;
}

export interface CashRegisterInput {
  name: string;
}

export interface CashSession {
  id: string;
  cashRegisterId: string;
  openedByUserId: string;
  openingBalance: string;
  openedAt: string;
  closedByUserId: string | null;
  closingBalance: string | null;
  expectedBalance: string | null;
  difference: string | null;
  closedAt: string | null;
}

/** El backend no serializa el getter `isOpen` — se deriva acá del campo real. */
export function isCashSessionOpen(session: CashSession): boolean {
  return session.closedAt === null;
}

export type CashMovementType = 'IN' | 'OUT';

export interface CashMovement {
  id: string;
  cashSessionId: string;
  type: CashMovementType;
  amount: string;
  paymentId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  companyId: string;
  bankName: string;
  accountType: 'CHECKING' | 'SAVINGS';
  accountNumber: string | null;
  cbu: string | null;
  alias: string | null;
  currency: string;
  isActive: boolean;
  glAccountId: string | null;
}

export interface BankAccountInput {
  bankName: string;
  accountType: 'CHECKING' | 'SAVINGS';
  accountNumber?: string;
  cbu?: string;
  alias?: string;
  currency?: string;
}

export interface BankAccountUpdateInput {
  bankName?: string;
  accountNumber?: string;
  cbu?: string;
  alias?: string;
}

export type BankMovementType = 'DEPOSIT' | 'WITHDRAWAL';

export interface BankMovement {
  id: string;
  bankAccountId: string;
  type: BankMovementType;
  amount: string;
  paymentId: string | null;
  description: string | null;
  date: string;
  isReconciled: boolean;
  reconciledAt: string | null;
  createdAt: string;
}

/**
 * Suma en centavos para evitar arrastre de punto flotante (mismo helper
 * que `pending-vouchers.ts`, F6) — cada módulo lo repite en vez de
 * compartirlo porque son handfuls de líneas y evita un acoplamiento
 * cruzado innecesario entre treasury/pending-vouchers y este archivo.
 */
function toCents(amount: string): number {
  return Math.round(Number(amount) * 100);
}
function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Saldo corriente de una sesión de caja (F7 §3.1) — misma fórmula que
 * `CloseCashSessionUseCase` en el backend (`openingBalance + Σ(IN) −
 * Σ(OUT)`), aplicada también mientras la sesión sigue abierta para poder
 * mostrar un número en pantalla. Si la sesión ya cerró, se usa el
 * `expectedBalance` persistido (snapshot inmutable) en vez de recalcular.
 */
export function computeCashSessionBalance(session: CashSession, movements: CashMovement[]): string {
  if (!isCashSessionOpen(session) && session.expectedBalance !== null) {
    return session.expectedBalance;
  }
  const sumIn = movements.filter((m) => m.type === 'IN').reduce((sum, m) => sum + toCents(m.amount), 0);
  const sumOut = movements.filter((m) => m.type === 'OUT').reduce((sum, m) => sum + toCents(m.amount), 0);
  return fromCents(toCents(session.openingBalance) + sumIn - sumOut);
}

/** Saldo de una cuenta bancaria (F7 §3.1) — sin campo persistido en el backend. */
export function computeBankAccountBalance(movements: BankMovement[]): string {
  const sumDeposit = movements
    .filter((m) => m.type === 'DEPOSIT')
    .reduce((sum, m) => sum + toCents(m.amount), 0);
  const sumWithdrawal = movements
    .filter((m) => m.type === 'WITHDRAWAL')
    .reduce((sum, m) => sum + toCents(m.amount), 0);
  return fromCents(sumDeposit - sumWithdrawal);
}

export function useCashRegisters(companyId: string, branchId: string) {
  return useQuery({
    queryKey: queryKeys.treasury.cashRegistersByBranch(companyId, branchId),
    queryFn: () =>
      apiFetch<CashRegister[]>(
        `companies/${companyId}/branches/${branchId}/cash-registers`,
        companyId,
      ),
    enabled: Boolean(companyId) && Boolean(branchId),
  });
}

/**
 * Todas las cajas de la empresa (todas las sucursales activas) — mismo
 * patrón de composición en dos etapas que useAllWarehouses (F4) y
 * useAllPointsOfSale (F5). Ya existía desde F6 (solo lectura); F7 lo
 * reutiliza para el listado y la gestión completa.
 */
export function useAllCashRegisters(companyId: string) {
  const branches = useBranches(companyId);
  const activeBranches = (branches.data ?? []).filter((b) => b.isActive);

  const registerQueries = useQueries({
    queries: activeBranches.map((branch) => ({
      queryKey: queryKeys.treasury.cashRegistersByBranch(companyId, branch.id),
      queryFn: () =>
        apiFetch<CashRegister[]>(
          `companies/${companyId}/branches/${branch.id}/cash-registers`,
          companyId,
        ),
      enabled: Boolean(companyId) && branches.isSuccess,
    })),
  });

  const isLoading =
    branches.isLoading || (registerQueries.length > 0 && registerQueries.some((q) => q.isLoading));
  const isSuccess = registerQueries.length === 0 || registerQueries.every((q) => q.isSuccess);

  const cashRegisters: CashRegisterWithBranch[] = registerQueries.flatMap((q, i) =>
    (q.data ?? []).map((r) => ({ ...r, branchName: activeBranches[i].name })),
  );

  return { cashRegisters, isLoading, isSuccess };
}

/** Invalida el listado de cajas de cualquier sucursal — mismo criterio que Depósitos (F4). */
function invalidateCashRegisterQueries(queryClient: ReturnType<typeof useQueryClient>, companyId: string) {
  queryClient.invalidateQueries({ queryKey: ['companies', companyId, 'branches'] });
}

export function useCreateCashRegister(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ branchId, input }: { branchId: string; input: CashRegisterInput }) =>
      apiFetch<CashRegister>(
        `companies/${companyId}/branches/${branchId}/cash-registers`,
        companyId,
        { method: 'POST', body: JSON.stringify(input) },
      ),
    onSuccess: () => invalidateCashRegisterQueries(queryClient, companyId),
  });
}

export function useUpdateCashRegister(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      branchId,
      cashRegisterId,
      input,
    }: {
      branchId: string;
      cashRegisterId: string;
      input: CashRegisterInput;
    }) =>
      apiFetch<CashRegister>(
        `companies/${companyId}/branches/${branchId}/cash-registers/${cashRegisterId}`,
        companyId,
        { method: 'PATCH', body: JSON.stringify(input) },
      ),
    onSuccess: () => invalidateCashRegisterQueries(queryClient, companyId),
  });
}

function useCashRegisterStatusMutation(companyId: string, action: 'activate' | 'deactivate') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ branchId, cashRegisterId }: { branchId: string; cashRegisterId: string }) =>
      apiFetch<CashRegister>(
        `companies/${companyId}/branches/${branchId}/cash-registers/${cashRegisterId}/${action}`,
        companyId,
        { method: 'POST' },
      ),
    onSuccess: () => invalidateCashRegisterQueries(queryClient, companyId),
  });
}

export function useActivateCashRegister(companyId: string) {
  return useCashRegisterStatusMutation(companyId, 'activate');
}

export function useDeactivateCashRegister(companyId: string) {
  return useCashRegisterStatusMutation(companyId, 'deactivate');
}

export function useCashSessions(companyId: string, branchId: string, cashRegisterId: string) {
  return useQuery({
    queryKey: queryKeys.treasury.cashSessions(companyId, branchId, cashRegisterId),
    queryFn: () =>
      apiFetch<CashSession[]>(
        `companies/${companyId}/branches/${branchId}/cash-registers/${cashRegisterId}/sessions`,
        companyId,
      ),
    enabled: Boolean(companyId) && Boolean(branchId) && Boolean(cashRegisterId),
  });
}

export interface OpenCashSessionRow extends CashSession {
  cashRegisterId: string;
  cashRegisterName: string;
  branchName: string;
}

/**
 * Sesiones de caja actualmente abiertas, en toda la empresa — para el
 * selector de "sesión de caja" al registrar un cobro/pago en efectivo
 * (RN-PAY-10, F6) y para la Vista general de F7. Composición en tres
 * etapas: sucursales → cajas → sesiones de cada caja, filtrando las
 * abiertas (a lo sumo una por caja, RN-CASH-02).
 */
export function useOpenCashSessions(companyId: string) {
  const { cashRegisters, isLoading: registersLoading, isSuccess: registersLoaded } =
    useAllCashRegisters(companyId);
  const activeRegisters = cashRegisters.filter((r) => r.isActive);

  const sessionQueries = useQueries({
    queries: activeRegisters.map((register) => ({
      queryKey: queryKeys.treasury.cashSessions(companyId, register.branchId, register.id),
      queryFn: () =>
        apiFetch<CashSession[]>(
          `companies/${companyId}/branches/${register.branchId}/cash-registers/${register.id}/sessions`,
          companyId,
        ),
      enabled: Boolean(companyId) && registersLoaded,
    })),
  });

  const isLoading =
    registersLoading || (sessionQueries.length > 0 && sessionQueries.some((q) => q.isLoading));

  const openSessions: OpenCashSessionRow[] = activeRegisters.flatMap((register, i) => {
    const sessions = sessionQueries[i]?.data ?? [];
    const open = sessions.find(isCashSessionOpen);
    return open
      ? [
          {
            ...open,
            cashRegisterId: register.id,
            cashRegisterName: register.name,
            branchName: register.branchName,
          },
        ]
      : [];
  });

  return { openSessions, isLoading };
}

export function useOpenCashSession(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      branchId,
      cashRegisterId,
      openingBalance,
    }: {
      branchId: string;
      cashRegisterId: string;
      openingBalance: string;
    }) =>
      apiFetch<CashSession>(
        `companies/${companyId}/branches/${branchId}/cash-registers/${cashRegisterId}/sessions`,
        companyId,
        { method: 'POST', body: JSON.stringify({ openingBalance }) },
      ),
    onSuccess: () => invalidateCashRegisterQueries(queryClient, companyId),
  });
}

export function useCloseCashSession(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cashSessionId, closingBalance }: { cashSessionId: string; closingBalance: string }) =>
      apiFetch<CashSession>(`companies/${companyId}/cash-sessions/${cashSessionId}/close`, companyId, {
        method: 'POST',
        body: JSON.stringify({ closingBalance }),
      }),
    onSuccess: () => invalidateCashRegisterQueries(queryClient, companyId),
  });
}

export function useCashMovements(companyId: string, cashSessionId: string) {
  return useQuery({
    queryKey: queryKeys.treasury.cashMovements(companyId, cashSessionId),
    queryFn: () =>
      apiFetch<CashMovement[]>(
        `companies/${companyId}/cash-sessions/${cashSessionId}/movements`,
        companyId,
      ),
    enabled: Boolean(companyId) && Boolean(cashSessionId),
  });
}

export function useCreateCashMovement(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      cashSessionId,
      type,
      amount,
      reason,
    }: {
      cashSessionId: string;
      type: CashMovementType;
      amount: string;
      reason: string;
    }) =>
      apiFetch<CashMovement>(
        `companies/${companyId}/cash-sessions/${cashSessionId}/movements`,
        companyId,
        { method: 'POST', body: JSON.stringify({ type, amount, reason }) },
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.treasury.cashMovements(companyId, variables.cashSessionId),
      });
      invalidateCashRegisterQueries(queryClient, companyId);
    },
  });
}

export function useBankAccounts(companyId: string) {
  return useQuery({
    queryKey: queryKeys.treasury.bankAccounts(companyId),
    queryFn: () => apiFetch<BankAccount[]>(`companies/${companyId}/bank-accounts`, companyId),
    enabled: Boolean(companyId),
  });
}

function invalidateBankAccountQueries(queryClient: ReturnType<typeof useQueryClient>, companyId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.treasury.bankAccounts(companyId) });
}

export interface BankAccountWithBalance extends BankAccount {
  balance: string;
}

/**
 * Cuentas bancarias con su saldo derivado (F7 §3.1) — compone `GET
 * bank-accounts` + `GET .../movements` de cada una vía useQueries.
 * Reutilizado por el listado y por `useCashBankOverview`.
 */
export function useBankAccountsWithBalance(companyId: string) {
  const bankAccounts = useBankAccounts(companyId);

  const movementQueries = useQueries({
    queries: (bankAccounts.data ?? []).map((account) => ({
      queryKey: queryKeys.treasury.bankMovements(companyId, account.id),
      queryFn: () =>
        apiFetch<BankMovement[]>(`companies/${companyId}/bank-accounts/${account.id}/movements`, companyId),
      enabled: Boolean(companyId) && bankAccounts.isSuccess,
    })),
  });

  const isLoading = bankAccounts.isLoading || movementQueries.some((q) => q.isLoading);

  const accounts: BankAccountWithBalance[] = (bankAccounts.data ?? []).map((account, i) => ({
    ...account,
    balance: computeBankAccountBalance(movementQueries[i]?.data ?? []),
  }));

  return { accounts, isLoading };
}

export function useCreateBankAccount(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BankAccountInput) =>
      apiFetch<BankAccount>(`companies/${companyId}/bank-accounts`, companyId, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateBankAccountQueries(queryClient, companyId),
  });
}

export function useUpdateBankAccount(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bankAccountId, input }: { bankAccountId: string; input: BankAccountUpdateInput }) =>
      apiFetch<BankAccount>(`companies/${companyId}/bank-accounts/${bankAccountId}`, companyId, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateBankAccountQueries(queryClient, companyId),
  });
}

function useBankAccountStatusMutation(companyId: string, action: 'activate' | 'deactivate') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bankAccountId }: { bankAccountId: string }) =>
      apiFetch<BankAccount>(
        `companies/${companyId}/bank-accounts/${bankAccountId}/${action}`,
        companyId,
        { method: 'POST' },
      ),
    onSuccess: () => invalidateBankAccountQueries(queryClient, companyId),
  });
}

export function useActivateBankAccount(companyId: string) {
  return useBankAccountStatusMutation(companyId, 'activate');
}

export function useDeactivateBankAccount(companyId: string) {
  return useBankAccountStatusMutation(companyId, 'deactivate');
}

export function useBankMovements(companyId: string, bankAccountId: string) {
  return useQuery({
    queryKey: queryKeys.treasury.bankMovements(companyId, bankAccountId),
    queryFn: () =>
      apiFetch<BankMovement[]>(`companies/${companyId}/bank-accounts/${bankAccountId}/movements`, companyId),
    enabled: Boolean(companyId) && Boolean(bankAccountId),
  });
}

export function useCreateBankMovement(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bankAccountId,
      type,
      amount,
      description,
      date,
    }: {
      bankAccountId: string;
      type: BankMovementType;
      amount: string;
      description: string;
      date?: string;
    }) =>
      apiFetch<BankMovement>(`companies/${companyId}/bank-accounts/${bankAccountId}/movements`, companyId, {
        method: 'POST',
        body: JSON.stringify({ type, amount, description, date }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.treasury.bankMovements(companyId, variables.bankAccountId),
      });
    },
  });
}

/**
 * Vista general de Caja y Bancos (F7 §5.1/5.4): total de efectivo
 * disponible en cajas actualmente abiertas (§3.1 — una caja sin sesión
 * abierta no aporta un "saldo actual" contable, solo el histórico de su
 * última sesión cerrada) + total en cuentas bancarias activas. Mismo
 * patrón de composición vía useQueries que useTreasuryOverview (F6).
 */
export function useCashBankOverview(companyId: string) {
  const { openSessions, isLoading: sessionsLoading } = useOpenCashSessions(companyId);
  const { accounts: bankAccounts, isLoading: bankAccountsLoading } = useBankAccountsWithBalance(companyId);
  const activeBankAccounts = bankAccounts.filter((a) => a.isActive);

  const sessionMovementQueries = useQueries({
    queries: openSessions.map((session) => ({
      queryKey: queryKeys.treasury.cashMovements(companyId, session.id),
      queryFn: () =>
        apiFetch<CashMovement[]>(`companies/${companyId}/cash-sessions/${session.id}/movements`, companyId),
      enabled: Boolean(companyId),
    })),
  });

  const isLoading = sessionsLoading || bankAccountsLoading || sessionMovementQueries.some((q) => q.isLoading);

  const totalCash = fromCents(
    openSessions.reduce(
      (sum, session, i) =>
        sum + toCents(computeCashSessionBalance(session, sessionMovementQueries[i]?.data ?? [])),
      0,
    ),
  );
  const totalBank = fromCents(
    activeBankAccounts.reduce(
      (sum, account) => sum + toCents(account.balance),
      0,
    ),
  );

  return { totalCash, totalBank, isLoading };
}
