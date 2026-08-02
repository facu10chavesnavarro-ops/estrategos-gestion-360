/**
 * Ids fijos de la empresa/sucursal dedicadas a la suite E2E (Sprint F4,
 * docs/frontend/07-sprint-f4-stock.md §3.7). Compartidos entre seed.ts
 * (que la crea) y reset-e2e-company.ts (que la vacía antes de cada
 * corrida completa de Playwright) para que ambos apunten siempre al
 * mismo registro sin tener que buscarlo por nombre.
 */
export const E2E_COMPANY_ID = '00000000-0000-0000-0000-000000000003';
export const E2E_BRANCH_ID = '00000000-0000-0000-0000-000000000004';
