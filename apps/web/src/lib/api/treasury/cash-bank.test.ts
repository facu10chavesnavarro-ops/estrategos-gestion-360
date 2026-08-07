import { describe, it, expect } from 'vitest';
import {
  computeCashSessionBalance,
  computeBankAccountBalance,
  isCashSessionOpen,
  type CashSession,
  type CashMovement,
  type BankMovement,
} from './cash-bank';

function makeSession(overrides: Partial<CashSession> = {}): CashSession {
  return {
    id: 's1',
    cashRegisterId: 'r1',
    openedByUserId: 'u1',
    openingBalance: '100.00',
    openedAt: '2026-08-06T00:00:00.000Z',
    closedByUserId: null,
    closingBalance: null,
    expectedBalance: null,
    difference: null,
    closedAt: null,
    ...overrides,
  };
}

function makeCashMovement(type: 'IN' | 'OUT', amount: string): CashMovement {
  return {
    id: `m-${type}-${amount}`,
    cashSessionId: 's1',
    type,
    amount,
    paymentId: null,
    reason: 'test',
    createdAt: '2026-08-06T00:00:00.000Z',
  };
}

function makeBankMovement(type: 'DEPOSIT' | 'WITHDRAWAL', amount: string): BankMovement {
  return {
    id: `m-${type}-${amount}`,
    bankAccountId: 'a1',
    type,
    amount,
    paymentId: null,
    description: 'test',
    date: '2026-08-06T00:00:00.000Z',
    isReconciled: false,
    reconciledAt: null,
    createdAt: '2026-08-06T00:00:00.000Z',
  };
}

describe('computeCashSessionBalance', () => {
  it('sesión abierta: saldo inicial + ingresos - egresos', () => {
    const session = makeSession({ openingBalance: '1000.00' });
    const movements = [makeCashMovement('IN', '200.00'), makeCashMovement('OUT', '50.00')];
    expect(computeCashSessionBalance(session, movements)).toBe('1150.00');
  });

  it('sesión abierta sin movimientos: devuelve el saldo inicial', () => {
    const session = makeSession({ openingBalance: '500.00' });
    expect(computeCashSessionBalance(session, [])).toBe('500.00');
  });

  it('sesión cerrada: usa el expectedBalance persistido en vez de recalcular', () => {
    const session = makeSession({
      openingBalance: '1000.00',
      closedAt: '2026-08-06T12:00:00.000Z',
      expectedBalance: '1150.00',
      closingBalance: '1140.00',
      difference: '-10.00',
    });
    // Aunque no se le pasen movimientos coherentes, debe respetar el
    // snapshot inmutable del backend, no recalcular con los movimientos.
    expect(computeCashSessionBalance(session, [])).toBe('1150.00');
  });

  it('arrastre de punto flotante: centavos se acumulan sin error', () => {
    const session = makeSession({ openingBalance: '0.10' });
    const movements = [makeCashMovement('IN', '0.20'), makeCashMovement('IN', '0.30')];
    expect(computeCashSessionBalance(session, movements)).toBe('0.60');
  });
});

describe('computeBankAccountBalance', () => {
  it('suma depósitos y resta extracciones', () => {
    const movements = [
      makeBankMovement('DEPOSIT', '1000.00'),
      makeBankMovement('WITHDRAWAL', '300.00'),
      makeBankMovement('DEPOSIT', '50.00'),
    ];
    expect(computeBankAccountBalance(movements)).toBe('750.00');
  });

  it('sin movimientos: saldo cero', () => {
    expect(computeBankAccountBalance([])).toBe('0.00');
  });
});

describe('isCashSessionOpen', () => {
  it('closedAt null: sesión abierta', () => {
    expect(isCashSessionOpen(makeSession({ closedAt: null }))).toBe(true);
  });

  it('closedAt informado: sesión cerrada', () => {
    expect(isCashSessionOpen(makeSession({ closedAt: '2026-08-06T12:00:00.000Z' }))).toBe(false);
  });
});
