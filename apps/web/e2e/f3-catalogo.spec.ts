import { test, expect } from '@playwright/test';
import { gotoAndSettle, reloadAndSettle, loginAsAdmin } from './helpers';

test.describe('Sprint F3 — Catálogo de Productos y Servicios', () => {
  test.describe.configure({ timeout: 180_000 });

  test('crear categoría → ítem con categoría e impuesto → agregarlo a una lista de precios; importar CSV', async ({
    page,
  }) => {
    const companyId = await loginAsAdmin(page);
    const stamp = Date.now();

    // --- Crear una categoría ---
    const categoryName = `Categoría E2E ${stamp}`;
    await gotoAndSettle(page, `/${companyId}/catalogo/categorias`);
    await page.getByRole('button', { name: '+ Nueva categoría' }).click();
    await page.getByLabel('Nombre').fill(categoryName);
    await page.getByRole('button', { name: 'Crear categoría' }).click();

    // En dev, la primera vez que se golpea una ruta el request puede tardar
    // varios segundos (ver helpers.ts submitWithHydrationRetry) — esperamos
    // a que el sheet se cierre (éxito) antes de buscar la fila nueva.
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
    await expect(page.getByText(categoryName)).toBeVisible({ timeout: 10_000 });

    // --- Crear un impuesto ---
    const taxName = `IVA E2E ${stamp}`;
    await gotoAndSettle(page, `/${companyId}/catalogo/impuestos`);
    await page.getByRole('button', { name: '+ Nuevo impuesto' }).click();
    await page.getByLabel('Nombre').fill(taxName);
    await page.getByLabel('Tasa (%)').fill('21');
    await page.getByRole('button', { name: 'Crear impuesto' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
    const taxesTable = page.getByRole('table');
    await expect(taxesTable.getByText(taxName)).toBeVisible({ timeout: 10_000 });

    // --- Crear un producto con esa categoría y ese impuesto ---
    const itemName = `Producto E2E ${stamp}`;
    const itemSku = `SKU-E2E-${stamp}`;
    await gotoAndSettle(page, `/${companyId}/catalogo/productos`);
    await page.getByRole('button', { name: '+ Nuevo producto' }).click();

    const sheet = page.getByRole('dialog');
    await sheet.getByLabel('SKU').fill(itemSku);
    await sheet.getByLabel('Nombre').fill(itemName);
    await sheet.getByLabel('Unidad de medida').fill('unidad');

    await sheet.getByRole('combobox').click();
    await page.getByRole('option', { name: categoryName }).click();

    const taxLabel = sheet.getByText(`${taxName} (21%)`);
    await taxLabel.locator('xpath=..').getByRole('checkbox').click();

    await sheet.getByRole('button', { name: 'Crear producto' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
    const itemsTable = page.getByRole('table');
    await expect(itemsTable.getByText(itemName)).toBeVisible({ timeout: 10_000 });

    // --- Crear una lista de precios y agregarle el producto ---
    const priceListName = `Lista E2E ${stamp}`;
    await gotoAndSettle(page, `/${companyId}/catalogo/listas-de-precio`);
    await page.getByRole('button', { name: '+ Nueva lista de precios' }).click();
    await page.getByLabel('Nombre').fill(priceListName);
    await page.getByRole('button', { name: 'Crear lista' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
    await expect(page.getByRole('link', { name: priceListName })).toBeVisible({ timeout: 10_000 });
    // La fila recién creada llega por refetch de TanStack Query (staleTime 0)
    // y puede remontarse una vez más justo después de aparecer — un reload
    // deja el DOM estable antes de navegar (mismo criterio que
    // reloadAndSettle en helpers.ts para las carreras de hidratación).
    await reloadAndSettle(page);
    await page.getByRole('link', { name: priceListName }).click();
    await page.waitForURL(/\/catalogo\/listas-de-precio\/[0-9a-f-]+$/, { timeout: 15_000 });
    await page.waitForTimeout(800);
    await expect(page.getByRole('heading', { name: priceListName })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: new RegExp(itemSku) }).click();
    await page.locator('input[inputmode="decimal"]').fill('1000');
    await page.getByRole('button', { name: '+ Agregar' }).click();

    const priceListTable = page.getByRole('table');
    await expect(priceListTable.getByText(itemName)).toBeVisible({ timeout: 10_000 });
    // El precio se edita inline en un <Input>, no como texto plano — se
    // verifica por su valor, no por getByText.
    await expect(
      priceListTable.locator('tr', { hasText: itemName }).getByRole('textbox'),
    ).toHaveValue('1000');

    // --- Importar un CSV de ítems ---
    await gotoAndSettle(page, `/${companyId}/catalogo/productos`);
    const importedA = `Producto E2E Import A ${stamp}`;
    const importedB = `Producto E2E Import B ${stamp}`;
    const csvContent = [
      'type,sku,name,unitOfMeasure',
      `PRODUCT,SKU-IMP-A-${stamp},${importedA},unidad`,
      `PRODUCT,SKU-IMP-B-${stamp},${importedB},unidad`,
    ].join('\n');

    await page.getByRole('button', { name: 'Importar CSV' }).click();
    await page
      .locator('#import-file')
      .setInputFiles({ name: 'productos.csv', mimeType: 'text/csv', buffer: Buffer.from(csvContent) });
    await page.getByRole('button', { name: 'Importar' }).click();

    const summaryDialog = page.getByRole('dialog');
    await expect(summaryDialog.getByText('Creados')).toBeVisible({ timeout: 10_000 });
    await expect(summaryDialog.getByText('Rechazados', { exact: false })).toHaveCount(0);
    await page.getByRole('button', { name: 'Listo' }).click();

    const productsTable = page.getByRole('table');
    await expect(productsTable.getByText(importedA)).toBeVisible({ timeout: 10_000 });
    await expect(productsTable.getByText(importedB)).toBeVisible();
  });
});
