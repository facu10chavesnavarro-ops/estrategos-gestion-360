import { test, expect, type Page } from '@playwright/test';

// Requiere apps/api corriendo en :3001 (con DB seedeada, ver
// apps/api/prisma/seed.ts) y apps/web en :3000. Usuario de prueba
// sembrado: admin@estrategos.local / CambiarEsta123! (rol "Administrador
// Estrategos", puede gestionar la empresa y su equipo).
const ADMIN_EMAIL = 'admin@estrategos.local';
const ADMIN_PASSWORD = 'CambiarEsta123!';

/**
 * En modo dev, el HTML puede pintarse antes de que React hidrate: un click
 * "demasiado rápido" dispara el submit nativo del <form> (GET) en vez del
 * handler de React. Un margen fijo y corto alcanza para hidratar sin
 * depender de 'networkidle' (TanStack Query hace refetches de fondo —
 * staleTime 0 — y esa espera nunca se cumple sola).
 */
async function gotoAndSettle(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
}

async function reloadAndSettle(page: Page) {
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
async function submitWithHydrationRetry(
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

async function loginAsAdmin(page: Page) {
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
    await page.getByRole('button').first().click();
  }
  // Generoso por la misma razón que submitWithHydrationRetry: primera vez
  // que se compila /[companyId]/inicio + el AppShell (incluye GET /auth/me).
  await page.waitForURL(/\/[0-9a-f-]+\/inicio$/, { timeout: 20_000 });

  const companyId = new URL(page.url()).pathname.split('/')[1];
  return companyId;
}

test.describe('Sprint F1 — Configuración', () => {
  test.describe.configure({ timeout: 90_000 });

  test('F5 en Configuración > Usuarios preserva los permisos de admin (GET /auth/me)', async ({
    page,
  }) => {
    const companyId = await loginAsAdmin(page);

    await gotoAndSettle(page, `/${companyId}/configuracion/usuarios`);
    await expect(page.getByRole('tab', { name: 'Miembros' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('link', { name: 'Usuarios' })).toBeVisible({ timeout: 10_000 });

    // Regresión: antes de GET /auth/me, un F5 en esta pantalla vaciaba
    // useSessionStore y ocultaba "Usuarios" para un admin legítimo.
    await reloadAndSettle(page);

    await expect(page.getByRole('link', { name: 'Usuarios' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('tab', { name: 'Miembros' })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/${companyId}/configuracion/usuarios$`));
  });

  test('invitar a un usuario, aceptar la invitación y verlo listado como miembro activo', async ({
    page,
    browser,
  }) => {
    const companyId = await loginAsAdmin(page);
    const email = `f1-e2e-${Date.now()}@estrategos.local`;

    await gotoAndSettle(page, `/${companyId}/configuracion/usuarios`);
    await page.getByRole('tab', { name: 'Invitaciones' }).click();
    await page.getByRole('button', { name: '+ Invitar' }).click();

    await page.getByLabel('Correo').fill(email);
    await page.getByRole('combobox').click();
    await page.getByRole('option').first().click();
    await page.getByRole('button', { name: 'Invitar' }).click();

    const linkInput = page.getByRole('textbox').last();
    await expect(linkInput).toHaveValue(/\/invitaciones\//, { timeout: 10_000 });
    const invitationUrl = await linkInput.inputValue();
    await page.getByRole('button', { name: 'Listo' }).click();

    // Aceptar la invitación como un navegador nuevo: no debe pisar la
    // cookie de sesión del admin en la pestaña original.
    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    await gotoAndSettle(guestPage, invitationUrl);
    await submitWithHydrationRetry(
      guestPage,
      invitationUrl,
      async () => {
        await guestPage.getByLabel('Nombre completo').fill('Invitado E2E');
        await guestPage.getByLabel('Contraseña').fill('ContraseñaNueva123!');
        await guestPage.getByRole('button', { name: 'Aceptar invitación' }).click();
      },
      /\/login\?invitacion=aceptada$/,
    );
    await guestContext.close();

    // La lista de miembros ya estaba montada (TanStack Query no la
    // refetchea solo por cambiar de tab) — se recarga para ver el estado
    // posterior a que el invitado aceptó en el otro contexto.
    await reloadAndSettle(page);
    await page.getByRole('tab', { name: 'Miembros' }).click();
    // Se escopea a la tabla de escritorio: la vista móvil (oculta por CSS,
    // no por el DOM) renderiza los mismos datos y duplicaría el match.
    const table = page.getByRole('table');
    await expect(table.getByText(email)).toBeVisible({ timeout: 10_000 });
    const row = table.locator('tr', { hasText: email });
    await expect(row.getByText('Activo')).toBeVisible();
  });
});
