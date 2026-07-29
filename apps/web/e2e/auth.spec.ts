import { test, expect } from '@playwright/test';

// Requiere apps/api corriendo en :3001 (con DB seedeada, ver
// apps/api/prisma/seed.ts) y apps/web en :3000. Usuario de prueba
// sembrado: admin@estrategos.local / CambiarEsta123!.
const TEST_EMAIL = 'admin@estrategos.local';
const TEST_PASSWORD = 'CambiarEsta123!';

test.describe('Flujo de autenticación (Sprint F0)', () => {
  test('login exitoso lleva al selector de empresa o a inicio', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo').fill(TEST_EMAIL);
    await page.getByLabel('Contraseña').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page).toHaveURL(/\/(seleccionar-empresa|[0-9a-f-]+\/inicio)/, {
      timeout: 10_000,
    });
  });

  test('login fallido muestra el mensaje de error del backend', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo').fill(TEST_EMAIL);
    await page.getByLabel('Contraseña').fill('contraseña-incorrecta');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    // Next.js inyecta su propio anunciador de rutas con role="alert" (vacío);
    // el nuestro es el único <p role="alert"> con texto real.
    await expect(page.locator('p[role="alert"]')).toHaveText('Credenciales inválidas', {
      timeout: 10_000,
    });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('logout limpia la sesión y redirige a /login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo').fill(TEST_EMAIL);
    await page.getByLabel('Contraseña').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Ingresar' }).click();

    // Si hay más de una empresa, elegir la primera para llegar al AppShell.
    await page.waitForURL(/\/(seleccionar-empresa|[0-9a-f-]+\/inicio)/, { timeout: 10_000 });
    if (page.url().includes('seleccionar-empresa')) {
      await page.getByRole('button').first().click();
    }
    await page.waitForURL(/\/[0-9a-f-]+\/inicio$/, { timeout: 10_000 });

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
