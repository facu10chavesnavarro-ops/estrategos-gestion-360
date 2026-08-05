import { useQueries, useQuery } from '@tanstack/react-query';
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

/**
 * Todas las cajas de la empresa (todas las sucursales activas) — mismo
 * patrón de composición en dos etapas que useAllWarehouses (F4) y
 * useAllPointsOfSale (F5). F6 solo necesita lectura: elegir una sesión
 * abierta para registrar un cobro/pago en efectivo — la gestión de
 * cajas (abrir/cerrar sesión, alta) es F7.
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

export interface OpenCashSessionRow extends CashSession {
  cashRegisterId: string;
  cashRegisterName: string;
  branchName: string;
}

/**
 * Sesiones de caja actualmente abiertas, en toda la empresa — para el
 * selector de "sesión de caja" al registrar un cobro/pago en efectivo
 * (RN-PAY-10: obligatoria si algún medio requiere movimiento de caja).
 * Composición en tres etapas: sucursales → cajas → sesiones de cada
 * caja, filtrando las abiertas (a lo sumo una por caja, RN-CASH-02).
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

export function useBankAccounts(companyId: string) {
  return useQuery({
    queryKey: queryKeys.treasury.bankAccounts(companyId),
    queryFn: () => apiFetch<BankAccount[]>(`companies/${companyId}/bank-accounts`, companyId),
    enabled: Boolean(companyId),
  });
}
