import { describe, it, expect } from 'vitest';
import {
  buildChartOfAccountsTree,
  collectExcludedAccountIds,
  type ChartOfAccount,
} from './chart-of-accounts';

function makeAccount(overrides: Partial<ChartOfAccount> = {}): ChartOfAccount {
  return {
    id: 'a1',
    companyId: 'c1',
    parentId: null,
    code: '1',
    name: 'Activo',
    type: 'ASSET',
    allowsMovements: false,
    isSystemAccount: true,
    isActive: true,
    ...overrides,
  };
}

describe('buildChartOfAccountsTree', () => {
  it('ordena por código y calcula la profundidad a partir de parentId', () => {
    const accounts: ChartOfAccount[] = [
      makeAccount({ id: 'root', code: '1', name: 'Activo', parentId: null }),
      makeAccount({ id: 'child2', code: '1.2', name: 'Bancos', parentId: 'root', allowsMovements: true, isSystemAccount: false }),
      makeAccount({ id: 'child1', code: '1.1', name: 'Caja', parentId: 'root', allowsMovements: true, isSystemAccount: false }),
    ];

    const tree = buildChartOfAccountsTree(accounts);

    expect(tree.map((n) => n.id)).toEqual(['root', 'child1', 'child2']);
    expect(tree.find((n) => n.id === 'root')?.depth).toBe(0);
    expect(tree.find((n) => n.id === 'child1')?.depth).toBe(1);
  });

  it('cuentas raíz sin parentId conocido no rompen el árbol (huérfanas ignoradas)', () => {
    const accounts: ChartOfAccount[] = [makeAccount({ id: 'orphan', code: '9.9', parentId: 'no-existe' })];
    expect(buildChartOfAccountsTree(accounts)).toEqual([]);
  });
});

describe('collectExcludedAccountIds', () => {
  it('excluye la propia cuenta y todos sus descendientes (evita ofrecer un ciclo)', () => {
    const accounts: ChartOfAccount[] = [
      makeAccount({ id: 'root', code: '1', parentId: null }),
      makeAccount({ id: 'child', code: '1.1', parentId: 'root' }),
      makeAccount({ id: 'grandchild', code: '1.1.1', parentId: 'child' }),
      makeAccount({ id: 'unrelated', code: '2', parentId: null }),
    ];

    const excluded = collectExcludedAccountIds(accounts, 'root');

    expect(excluded.has('root')).toBe(true);
    expect(excluded.has('child')).toBe(true);
    expect(excluded.has('grandchild')).toBe(true);
    expect(excluded.has('unrelated')).toBe(false);
  });
});
