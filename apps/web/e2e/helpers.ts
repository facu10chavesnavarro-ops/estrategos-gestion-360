import type { Page } from '@playwright/test';

// Requiere apps/api corriendo en :3001 (con DB seedeada, ver
// apps/api/prisma/seed.ts) y apps/web en :3000. Usuario de prueba
// sembrado: admin@estrategos.local / CambiarEsta123! (rol "Administrador
// Estrategos", puede gestionar la empresa y su equipo).
export const ADMIN_EMAIL = 'admin@estrategos.local';
export const ADMIN_PASSWORD = 'CambiarEsta123!';

// Empresa dedicada a la suite E2E (Sprint F4, docs/frontend/07-sprint-f4-stock.md
// §3.7) — nunca "Empresa Piloto SRL" ni ninguna otra, para no acumular
// datos de negocio sobre una empresa real de otras pruebas manuales.
// Se vacía por companyId antes de cada corrida completa (globalSetup en
// playwright.config.ts + apps/api/prisma/reset-e2e-company.ts).
// El botón del selector de empresa concatena legalName + taxId como su
// nombre accesible — se matchea por ambos (no solo "Empresa E2E") para
// no confundirla con otra empresa de nombre parecido creada a mano.
export const E2E_COMPANY_NAME = /^Empresa E2E 30-00000000-1$/;

/**
 * En modo dev, el HTML puede pintarse antes de que React hidrate: un click
 * "demasiado rápido" dispara el submit nativo del <form> (GET) en vez del
 * handler de React. Un margen fijo y corto alcanza para hidratar sin
 * depender de 'networkidle' (TanStack Query hace refetches de fondo —
 * staleTime 0 — y esa espera nunca se cumple sola).
 */
export async function gotoAndSettle(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
}

export async function reloadAndSettle(page: Page) {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
}

/**
 * Reintenta un submit si la condición de carrera de hidratación (ver
 * arriba) lo tiró al GET nativo — se nota porque `page.url()` no cambia al
 * patrón esperado tras el submit. Vuelve a cargar `formUrl` y reintenta
 * `fillAndSubmit` hasta 3 veces antes de rendirse. El timeout por intento
 * es generoso (15s): en dev, la PRIMERA vez que se golpea una ruta (login,
 * el proxy /api/backend/*, etc.) Next.js la compila on-demand y la vuelta
 * completa puede tardar varios segundos aun cuando el submit sí hidrató
 * bien — un timeout corto aborta un intento que en realidad iba a
 * funcionar y lo confunde con la carrera de hidratación.
 */
export async function submitWithHydrationRetry(
  page: Page,
  formUrl: string,
  fillAndSubmit: () => Promise<void>,
  expectedUrl: RegExp,
) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await fillAndSubmit();
    try {
      await page.waitForURL(expectedUrl, { timeout: 15_000 });
      return;
    } catch (err) {
      if (attempt === 3) throw err;
      await gotoAndSettle(page, formUrl);
    }
  }
}

export async function loginAsAdmin(page: Page) {
  await gotoAndSettle(page, '/login');
  await submitWithHydrationRetry(
    page,
    '/login',
    async () => {
      await page.getByLabel('Correo').fill(ADMIN_EMAIL);
      await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: 'Ingresar' }).click();
    },
    /\/(seleccionar-empresa|[0-9a-f-]+\/inicio)/,
  );

  if (page.url().includes('seleccionar-empresa')) {
    await page.getByRole('button', { name: E2E_COMPANY_NAME }).click();
  }
  // Generoso por la misma razón que submitWithHydrationRetry: primera vez
  // que se compila /[companyId]/inicio + el AppShell (incluye GET /auth/me).
  await page.waitForURL(/\/[0-9a-f-]+\/inicio$/, { timeout: 20_000 });

  return new URL(page.url()).pathname.split('/')[1];
}
