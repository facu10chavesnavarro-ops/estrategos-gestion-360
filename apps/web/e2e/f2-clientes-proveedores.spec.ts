import { test, expect } from '@playwright/test';
import { gotoAndSettle, loginAsAdmin } from './helpers';

test.describe('Sprint F2 — Clientes y Proveedores', () => {
  test.describe.configure({ timeout: 90_000 });

  test('crear un cliente, importar un CSV de proveedores y desactivar uno', async ({ page }) => {
    const companyId = await loginAsAdmin(page);
    const stamp = Date.now();

    // --- Crear un cliente ---
    await gotoAndSettle(page, `/${companyId}/clientes`);
    await page.getByRole('button', { name: '+ Nuevo cliente' }).click();
    await page.getByLabel('Razón social').fill(`Cliente E2E ${stamp}`);
    await page.getByRole('button', { name: 'Crear cliente' }).click();

    const customersTable = page.getByRole('table');
    await expect(customersTable.getByText(`Cliente E2E ${stamp}`)).toBeVisible({ timeout: 10_000 });

    // --- Importar un CSV de proveedores ---
    await gotoAndSettle(page, `/${companyId}/proveedores`);
    const supplierA = `Proveedor E2E A ${stamp}`;
    const supplierB = `Proveedor E2E B ${stamp}`;
    const csvContent = [
      'legalName,taxId',
      `${supplierA},`,
      `${supplierB},`,
    ].join('\n');

    await page.getByRole('button', { name: 'Importar CSV' }).click();
    await page
      .locator('#import-file')
      .setInputFiles({ name: 'proveedores.csv', mimeType: 'text/csv', buffer: Buffer.from(csvContent) });
    await page.getByRole('button', { name: 'Importar' }).click();

    const summaryDialog = page.getByRole('dialog');
    await expect(summaryDialog.getByText('Creados')).toBeVisible({ timeout: 10_000 });
    // Sin rechazados: ambas filas del CSV son válidas y nuevas.
    await expect(summaryDialog.getByText('Rechazados', { exact: false })).toHaveCount(0);
    await page.getByRole('button', { name: 'Listo' }).click();

    const suppliersTable = page.getByRole('table');
    await expect(suppliersTable.getByText(supplierA)).toBeVisible({ timeout: 10_000 });
    await expect(suppliersTable.getByText(supplierB)).toBeVisible();

    // --- Desactivar uno de los proveedores importados y verificar ---
    const rowA = suppliersTable.locator('tr', { hasText: supplierA });
    await rowA.getByRole('button', { name: 'Desactivar' }).click();
    await expect(
      page.getByText(`¿Confirmás desactivar a "${supplierA}"?`),
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Confirmar' }).click();

    await expect(rowA.getByText('Inactivo')).toBeVisible({ timeout: 10_000 });
    // El otro proveedor importado sigue activo — la desactivación no afectó
    // a nadie más.
    const rowB = suppliersTable.locator('tr', { hasText: supplierB });
    await expect(rowB.getByText('Activo')).toBeVisible();
  });
});
