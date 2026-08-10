import { describe, it, expect } from 'vitest';
import {
  computeJournalEntryDifference,
  isJournalEntryBalanced,
  isJournalEntryReversed,
  findJournalEntryBySource,
  type CreateManualJournalEntryLineInput,
  type JournalEntry,
} from './journal-entries';

function line(debit: string, credit: string): CreateManualJournalEntryLineInput {
  return { accountId: 'a1', debit, credit };
}

function makeEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: 'e1',
    companyId: 'c1',
    date: '2026-08-10T00:00:00.000Z',
    description: 'Asiento',
    currency: 'ARS',
    exchangeRate: '1',
    origin: 'MANUAL',
    sourceType: null,
    sourceId: null,
    reversalOfEntryId: null,
    createdByUserId: 'u1',
    createdAt: '2026-08-10T00:00:00.000Z',
    lines: [],
    ...overrides,
  };
}

describe('computeJournalEntryDifference', () => {
  it('Σdébito − Σcrédito en centavos, sin arrastre de punto flotante', () => {
    expect(computeJournalEntryDifference([line('0.10', '0'), line('0', '0.30')])).toBe('-0.20');
  });

  it('balanceado devuelve 0.00', () => {
    expect(computeJournalEntryDifference([line('500', '0'), line('0', '500')])).toBe('0.00');
  });

  it('líneas vacías (sin cargar) cuentan como cero', () => {
    expect(computeJournalEntryDifference([line('', ''), line('', '')])).toBe('0.00');
  });
});

describe('isJournalEntryBalanced', () => {
  it('requiere al menos dos líneas y diferencia cero', () => {
    expect(isJournalEntryBalanced([line('100', '0'), line('0', '100')])).toBe(true);
    expect(isJournalEntryBalanced([line('100', '0'), line('0', '90')])).toBe(false);
    expect(isJournalEntryBalanced([line('100', '100')])).toBe(false);
  });
});

describe('isJournalEntryReversed', () => {
  it('true si algún asiento de la lista revierte al id dado', () => {
    const entries = [makeEntry({ id: 'e1' }), makeEntry({ id: 'e2', reversalOfEntryId: 'e1' })];
    expect(isJournalEntryReversed(entries, 'e1')).toBe(true);
    expect(isJournalEntryReversed(entries, 'e2')).toBe(false);
  });
});

describe('findJournalEntryBySource', () => {
  it('encuentra el asiento cuyo sourceType/sourceId coinciden', () => {
    const entries = [
      makeEntry({ id: 'e1', sourceType: 'VOUCHER', sourceId: 'v1' }),
      makeEntry({ id: 'e2', sourceType: 'PAYMENT', sourceId: 'p1' }),
    ];
    expect(findJournalEntryBySource(entries, 'VOUCHER', 'v1')?.id).toBe('e1');
    expect(findJournalEntryBySource(entries, 'PAYMENT', 'p1')?.id).toBe('e2');
    expect(findJournalEntryBySource(entries, 'VOUCHER', 'no-existe')).toBeUndefined();
  });
});
