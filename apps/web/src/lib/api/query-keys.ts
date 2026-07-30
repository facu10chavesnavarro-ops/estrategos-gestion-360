/**
 * Fábrica centralizada de query keys — evita strings sueltos repetidos en
 * cada hook de lib/api/<módulo>.ts y mantiene la invalidación de caché
 * consistente. Cada módulo nuevo (F1-F8) agrega su propia entrada acá con
 * el mismo patrón: all(companyId) como base, list/detail derivan de ella.
 */
export const queryKeys = {
  auth: {
    me: (companyId: string) => ['auth', 'me', companyId] as const,
  },
  companies: {
    mine: () => ['companies', 'mine'] as const,
    detail: (companyId: string) => ['companies', companyId] as const,
    branches: (companyId: string) => ['companies', companyId, 'branches'] as const,
  },
  users: {
    members: (companyId: string) => ['companies', companyId, 'members'] as const,
    invitations: (companyId: string) => ['companies', companyId, 'invitations'] as const,
    roles: () => ['roles'] as const,
  },
  customers: {
    list: (companyId: string, filters: { search?: string; isActive?: boolean }) =>
      ['companies', companyId, 'customers', filters] as const,
    detail: (companyId: string, customerId: string) =>
      ['companies', companyId, 'customers', customerId] as const,
    currentAccount: (companyId: string, customerId: string) =>
      ['companies', companyId, 'customers', customerId, 'current-account'] as const,
  },
  suppliers: {
    list: (companyId: string, filters: { search?: string; isActive?: boolean }) =>
      ['companies', companyId, 'suppliers', filters] as const,
    detail: (companyId: string, supplierId: string) =>
      ['companies', companyId, 'suppliers', supplierId] as const,
    currentAccount: (companyId: string, supplierId: string) =>
      ['companies', companyId, 'suppliers', supplierId, 'current-account'] as const,
  },
};
