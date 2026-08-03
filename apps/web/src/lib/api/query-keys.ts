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
  categories: {
    list: (companyId: string, isActive?: boolean) =>
      ['companies', companyId, 'categories', { isActive }] as const,
    detail: (companyId: string, categoryId: string) =>
      ['companies', companyId, 'categories', categoryId] as const,
  },
  items: {
    list: (
      companyId: string,
      filters: { type?: string; categoryId?: string; isActive?: boolean; search?: string },
    ) => ['companies', companyId, 'items', filters] as const,
    detail: (companyId: string, itemId: string) =>
      ['companies', companyId, 'items', itemId] as const,
  },
  taxes: {
    list: (companyId: string, onlyCurrentlyValid?: boolean) =>
      ['companies', companyId, 'taxes', { onlyCurrentlyValid }] as const,
  },
  priceLists: {
    list: (companyId: string, isActive?: boolean) =>
      ['companies', companyId, 'price-lists', { isActive }] as const,
    items: (companyId: string, priceListId: string) =>
      ['companies', companyId, 'price-lists', priceListId, 'items'] as const,
  },
  inventory: {
    warehousesByBranch: (companyId: string, branchId: string) =>
      ['companies', companyId, 'branches', branchId, 'warehouses'] as const,
    stock: (companyId: string, warehouseId: string, itemId?: string) =>
      ['companies', companyId, 'warehouses', warehouseId, 'stock', itemId] as const,
    stockMovements: (
      companyId: string,
      warehouseId: string,
      filters: { itemId?: string; type?: string; from?: string; to?: string },
    ) => ['companies', companyId, 'warehouses', warehouseId, 'stock-movements', filters] as const,
  },
  vouchers: {
    pointsOfSaleByBranch: (companyId: string, branchId: string) =>
      ['companies', companyId, 'branches', branchId, 'points-of-sale'] as const,
    voucherTypes: () => ['voucher-types'] as const,
    list: (
      companyId: string,
      filters: { partyId?: string; voucherTypeId?: string; from?: string; to?: string },
    ) => ['companies', companyId, 'vouchers', filters] as const,
    detail: (companyId: string, voucherId: string) =>
      ['companies', companyId, 'vouchers', voucherId] as const,
  },
};
