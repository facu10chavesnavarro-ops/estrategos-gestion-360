import { test, expect } from '@playwright/test';
import { gotoAndSettle, submitWithHydrationRetry } from './helpers';

// Requiere apps/api corriendo en :3001 (con DB seedeada, ver
// apps/api/prisma/seed.ts) y apps/web en :3000. Usuario de prueba
// sembrado: admin@estrategos.local / CambiarEsta123!.
const TEST_EMAIL = 'admin@estrategos.local';
const TEST_PASSWORD = 'CambiarEsta123!';

test.describe('Flujo de autenticación (Sprint F0)', () => {
  test('login exitoso lleva al selector de empresa o a inicio', async ({ page }) => {
    await gotoAndSettle(page, '/login');
    await submitWithHydrationRetry(
      page,
      '/login',
      async () => {
        await page.getByLabel('Correo').fill(TEST_EMAIL);
        await page.getByLabel('Contraseña').fill(TEST_PASSWORD);
        await page.getByRole('button', { name: 'Ingresar' }).click();
      },
      /\/(seleccionar-empresa|[0-9a-f-]+\/inicio)/,
    );
  });

  test('login fallido muestra el mensaje de error del backend', async ({ page }) => {
    await gotoAndSettle(page, '/login');

    // Esta prueba no cambia de URL en el camino esperado (se queda en
    // /login), así que submitWithHydrationRetry no aplica tal cual —
    // reintenta a mano si la carrera de hidratación (ver helpers.ts)
    // tira el submit a un GET nativo antes de que el alert aparezca.
    const alert = page.locator('p[role="alert"]');
    for (let attempt = 1; attempt <= 3; attempt++) {
      await page.getByLabel('Correo').fill(TEST_EMAIL);
      await page.getByLabel('Contraseña').fill('contraseña-incorrecta');
      await page.getByRole('button', { name: 'Ingresar' }).click();
      try {
        await expect(alert).toHaveText('Credenciales inválidas', { timeout: 10_000 });
        break;
      } catch (err) {
        if (attempt === 3) throw err;
        await gotoAndSettle(page, '/login');
      }
    }
    await expect(page).toHaveURL(/\/login$/);
  });

  test('logout limpia la sesión y redirige a /login', async ({ page }) => {
    await gotoAndSettle(page, '/login');
    await submitWithHydrationRetry(
      page,
      '/login',
      async () => {
        await page.getByLabel('Correo').fill(TEST_EMAIL);
        await page.getByLabel('Contraseña').fill(TEST_PASSWORD);
        await page.getByRole('button', { name: 'Ingresar' }).click();
      },
      /\/(seleccionar-empresa|[0-9a-f-]+\/inicio)/,
    );

    // Si hay más de una empresa, elegir la primera para llegar al AppShell —
    // a este test no le importa cuál, solo que el logout limpie la sesión.
    if (page.url().includes('seleccionar-empresa')) {
      await page.getByRole('button').first().click();
    }
    await page.waitForURL(/\/[0-9a-f-]+\/inicio$/, { timeout: 20_000 });

    // El menú de usuario es siempre el último botón del topbar (después del
    // toggle de sidebar y el CompanySwitcher, ver components/layout/app-shell.tsx).
    await page.locator('header button').last().click();
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();

    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });
  });

  test('acceder a una ruta autenticada sin sesión redirige a /login', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/00000000-0000-0000-0000-000000000002/inicio');

    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });
  });
});
