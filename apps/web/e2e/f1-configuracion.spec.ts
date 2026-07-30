import { test, expect } from '@playwright/test';
import { gotoAndSettle, reloadAndSettle, submitWithHydrationRetry, loginAsAdmin } from './helpers';

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
