/**
 * Fábrica centralizada de query keys — evita strings sueltos repetidos en
 * cada hook de lib/api/<módulo>.ts y mantiene la invalidación de caché
 * consistente. Cada módulo nuevo (F1-F8) agrega su propia entrada acá con
 * el mismo patrón: all(companyId) como base, list/detail derivan de ella.
 */
export const queryKeys = {
  companies: {
    mine: () => ['companies', 'mine'] as const,
  },
};
