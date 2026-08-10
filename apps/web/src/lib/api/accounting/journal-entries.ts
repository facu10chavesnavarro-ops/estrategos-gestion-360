import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../http-client';
import { queryKeys } from '../query-keys';

export type JournalEntryOrigin = 'AUTOMATIC' | 'MANUAL';
export type JournalEntrySourceType = 'VOUCHER' | 'PAYMENT';

export interface JournalEntryLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  debit: string;
  credit: string;
  description: string | null;
}

/**
 * Inmutable — no hay endpoint de edición ni borrado, solo reversión
 * (crea un asiento nuevo, ver `useReverseJournalEntry`). `sourceType`/
 * `sourceId` nulos = asiento manual o de un movimiento manual de caja/
 * banco (F7) — sin forma de navegar hacia ese movimiento, el modelo no
 * guarda esa referencia (§2.1, docs/frontend/11-sprint-f8-contabilidad.md).
 */
export interface JournalEntry {
  id: string;
  companyId: string;
  date: string;
  description: string;
  currency: string;
  exchangeRate: string;
  origin: JournalEntryOrigin;
  sourceType: JournalEntrySourceType | null;
  sourceId: string | null;
  reversalOfEntryId: string | null;
  createdByUserId: string;
  createdAt: string;
  lines: JournalEntryLine[];
}

export interface CreateManualJournalEntryLineInput {
  accountId: string;
  debit: string;
  credit: string;
  description?: string;
}

export interface CreateManualJournalEntryInput {
  date?: string;
  description: string;
  currency?: string;
  lines: CreateManualJournalEntryLineInput[];
}

export interface JournalEntriesFilters {
  from?: string;
  to?: string;
}

export function useJournalEntries(companyId: string, filters: JournalEntriesFilters = {}) {
  return useQuery({
    queryKey: queryKeys.accounting.journalEntries(companyId, filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      const qs = params.toString();
      return apiFetch<JournalEntry[]>(
        `companies/${companyId}/journal-entries${qs ? `?${qs}` : ''}`,
        companyId,
      );
    },
    enabled: Boolean(companyId),
  });
}

/**
 * Todos los asientos de la empresa, sin filtro de fecha — el backend no
 * expone `sourceType`/`sourceId` como filtro ni un flag `isReversed`,
 * así que "¿ya fue revertido?" y "¿qué asiento generó este Comprobante/
 * Pago?" se resuelven en el cliente sobre esta lista completa (§3.3,
 * docs/frontend/11-sprint-f8-contabilidad.md — documentado ahí como
 * deuda técnica de escalabilidad, no como decisión ideal).
 */
export function useAllJournalEntries(companyId: string) {
  return useJournalEntries(companyId, {});
}

/** true si algún asiento de la lista revierte a `entryId` (§3.3). */
export function isJournalEntryReversed(entries: JournalEntry[], entryId: string): boolean {
  return entries.some((e) => e.reversalOfEntryId === entryId);
}

/** El asiento (si existe) generado automáticamente por un Comprobante o Cobro/Pago dado (§3.3). */
export function findJournalEntryBySource(
  entries: JournalEntry[],
  sourceType: JournalEntrySourceType,
  sourceId: string,
): JournalEntry | undefined {
  return entries.find((e) => e.sourceType === sourceType && e.sourceId === sourceId);
}

export function useJournalEntry(companyId: string, journalEntryId: string) {
  return useQuery({
    queryKey: queryKeys.accounting.journalEntryDetail(companyId, journalEntryId),
    queryFn: () =>
      apiFetch<JournalEntry>(`companies/${companyId}/journal-entries/${journalEntryId}`, companyId),
    enabled: Boolean(companyId) && Boolean(journalEntryId),
  });
}

function invalidateJournalEntryQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string,
) {
  queryClient.invalidateQueries({ queryKey: ['companies', companyId, 'journal-entries'] });
  // Una reversión o un alta manual pueden afectar el saldo de cualquier cuenta involucrada.
  queryClient.invalidateQueries({ queryKey: ['companies', companyId, 'chart-of-accounts'] });
}

export function useCreateManualJournalEntry(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateManualJournalEntryInput) =>
      apiFetch<JournalEntry>(`companies/${companyId}/journal-entries`, companyId, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateJournalEntryQueries(queryClient, companyId),
  });
}

export function useReverseJournalEntry(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (journalEntryId: string) =>
      apiFetch<JournalEntry>(`companies/${companyId}/journal-entries/${journalEntryId}/reverse`, companyId, {
        method: 'POST',
      }),
    onSuccess: () => invalidateJournalEntryQueries(queryClient, companyId),
  });
}

/**
 * Suma en centavos para evitar arrastre de punto flotante (mismo
 * criterio que `cash-bank.ts`/`pending-vouchers.ts`, F6/F7 — cada
 * módulo lo repite en vez de compartirlo).
 */
function toCents(amount: string): number {
  return Math.round(Number(amount || '0') * 100);
}
function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Diferencia Σdebit − Σcredit de las líneas cargadas en el alta manual
 * (§3.1) — el frontend la usa solo para habilitar/deshabilitar el botón
 * de confirmar; el balanceo definitivo lo valida el backend
 * (`UnbalancedJournalEntryError`).
 */
export function computeJournalEntryDifference(lines: CreateManualJournalEntryLineInput[]): string {
  const totalDebit = lines.reduce((sum, l) => sum + toCents(l.debit), 0);
  const totalCredit = lines.reduce((sum, l) => sum + toCents(l.credit), 0);
  return fromCents(totalDebit - totalCredit);
}

export function isJournalEntryBalanced(lines: CreateManualJournalEntryLineInput[]): boolean {
  return lines.length >= 2 && computeJournalEntryDifference(lines) === '0.00';
}
