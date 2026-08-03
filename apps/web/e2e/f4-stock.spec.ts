import { test, expect } from '@playwright/test';
import { gotoAndSettle, reloadAndSettle, loginAsAdmin } from './helpers';

test.describe('Sprint F4 — Stock', () => {
  test.describe.configure({ timeout: 180_000 });

  test('crear depósito → ajustar stock → consultar por producto/depósito → transferir → rechazo de operación inválida → persistencia', async ({
    page,
  }) => {
    const companyId = await loginAsAdmin(page);
    const stamp = Date.now();

    // --- Crear un producto que controla stock (Catálogo, F3) ---
    const itemName = `Producto Stock E2E ${stamp}`;
    const itemSku = `SKU-STK-${stamp}`;
    await gotoAndSettle(page, `/${companyId}/catalogo/productos`);
    await page.getByRole('button', { name: '+ Nuevo producto' }).click();

    const itemSheet = page.getByRole('dialog');
    await itemSheet.getByLabel('SKU').fill(itemSku);
    await itemSheet.getByLabel('Nombre').fill(itemName);
    await itemSheet.getByLabel('Unidad de medida').fill('unidad');
    const tracksStockLabel = itemSheet.getByText('Controla stock');
    await tracksStockLabel.locator('xpath=..').getByRole('checkbox').click();
    await itemSheet.getByRole('button', { name: 'Crear producto' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
    const itemsTable = page.getByRole('table');
    await expect(itemsTable.getByText(itemName)).toBeVisible({ timeout: 10_000 });

    // --- Crear dos depósitos ---
    const warehouseA = `Depósito A E2E ${stamp}`;
    const warehouseB = `Depósito B E2E ${stamp}`;
    await gotoAndSettle(page, `/${companyId}/stock/depositos`);

    for (const name of [warehouseA, warehouseB]) {
      await page.getByRole('button', { name: '+ Nuevo depósito' }).click();
      const sheet = page.getByRole('dialog');
      await sheet.getByLabel('Nombre').fill(name);
      await sheet.getByRole('combobox').click();
      await page.getByRole('option').first().click();
      await sheet.getByRole('button', { name: 'Crear depósito' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
    }

    // Generoso: useAllWarehouses compone dos etapas de consultas
    // (sucursales → depósitos de cada una) y tras un reload completo puede
    // tardar más que el settle fijo de reloadAndSettle.
    await reloadAndSettle(page);
    const depositsTable = page.getByRole('table');
    await expect(depositsTable.getByText(warehouseA)).toBeVisible({ timeout: 20_000 });
    await expect(depositsTable.getByText(warehouseB)).toBeVisible();

    // --- Entrar al depósito A y ajustar stock (entrada) ---
    await depositsTable.getByRole('link', { name: warehouseA }).click();
    await page.waitForURL(/\/stock\/depositos\/[0-9a-f-]+$/, { timeout: 15_000 });
    await page.waitForTimeout(800);

    await page.getByRole('button', { name: 'Ajustar stock' }).click();
    const adjustSheet = page.getByRole('dialog');
    await adjustSheet.getByRole('combobox').first().click();
    await page.getByRole('option', { name: new RegExp(itemSku) }).click();
    await adjustSheet.getByLabel('Cantidad').fill('20');
    await adjustSheet.getByLabel('Costo unitario').fill('50');
    await adjustSheet.getByRole('button', { name: 'Registrar movimiento' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });

    // --- Verificar stock actual del depósito A ---
    await expect(page.getByText('Stock actual')).toBeVisible();
    // Filtra por un header exclusivo de "Stock actual" ("Costo promedio")
    // en vez de .first() por posición: "Historial de movimientos" es
    // también un <table> en la misma página y, bajo carga, puede
    // renderizar primero en el DOM mientras "Stock actual" sigue
    // "Cargando…" — .first() quedaría apuntando a la tabla equivocada.
    const stockTable = page.getByRole('table').filter({ hasText: 'Costo promedio' });
    await expect(stockTable.getByText(itemName)).toBeVisible({ timeout: 20_000 });
    await expect(stockTable.getByText('20', { exact: true })).toBeVisible();

    // --- Rechazo de operación inválida: ajuste de salida sin stock suficiente ---
    await page.getByRole('button', { name: 'Ajustar stock' }).click();
    const invalidAdjustSheet = page.getByRole('dialog');
    await invalidAdjustSheet.getByRole('combobox').first().click();
    await page.getByRole('option', { name: new RegExp(itemSku) }).click();
    await invalidAdjustSheet.getByRole('combobox').nth(1).click();
    await page.getByRole('option', { name: 'Salida' }).click();
    await invalidAdjustSheet.getByLabel('Cantidad').fill('9999');
    await invalidAdjustSheet.getByLabel('Motivo').fill('Prueba de rechazo E2E');
    await invalidAdjustSheet.getByRole('button', { name: 'Registrar movimiento' }).click();

    await expect(
      page.getByText('No hay stock suficiente para esta salida en este depósito.'),
    ).toBeVisible({ timeout: 10_000 });
    // El sheet sigue abierto: el rechazo no cerró el formulario ni movió stock.
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');

    // --- Consultar stock por producto ---
    await gotoAndSettle(page, `/${companyId}/stock/productos`);
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: new RegExp(itemSku) }).click();
    const byProductTable = page.getByRole('table');
    await expect(byProductTable.getByText(warehouseA)).toBeVisible({ timeout: 20_000 });
    await expect(byProductTable.getByText('20')).toBeVisible();

    // --- Vista general ---
    await gotoAndSettle(page, `/${companyId}/stock/general`);
    const overviewTable = page.getByRole('table');
    await expect(overviewTable.getByText(itemName)).toBeVisible({ timeout: 20_000 });
    await expect(overviewTable.getByText(warehouseA)).toBeVisible();

    // --- Transferir 5 unidades de A a B ---
    await gotoAndSettle(page, `/${companyId}/stock/transferencias`);
    const transferCombos = page.getByRole('combobox');
    await transferCombos.nth(0).click();
    await page.getByRole('option', { name: new RegExp(warehouseA) }).click();
    await transferCombos.nth(1).click();
    await page.getByRole('option', { name: new RegExp(warehouseB) }).click();
    await transferCombos.nth(2).click();
    await page.getByRole('option', { name: new RegExp(itemSku) }).click();
    await page.locator('input[inputmode="decimal"]').fill('5');
    await page.getByLabel('Motivo').fill('Transferencia E2E');
    await page.getByRole('button', { name: 'Transferir' }).click();

    await page.waitForURL(/\/stock\/depositos\/[0-9a-f-]+$/, { timeout: 15_000 });
    await page.waitForTimeout(800);
    await expect(page.getByText(warehouseB)).toBeVisible({ timeout: 20_000 });
    const destStockTable = page.getByRole('table').first();
    await expect(destStockTable.getByText(itemName)).toBeVisible({ timeout: 10_000 });
    // exact:true — "5" es substring de "50" (el costo), no alcanza con matchear texto parcial.
    await expect(destStockTable.getByText('5', { exact: true })).toBeVisible();

    // --- Confirmar persistencia tras recargar ---
    await reloadAndSettle(page);
    await expect(page.getByText(warehouseB)).toBeVisible({ timeout: 20_000 });
    const reloadedStockTable = page.getByRole('table').first();
    await expect(reloadedStockTable.getByText(itemName)).toBeVisible({ timeout: 10_000 });
    await expect(reloadedStockTable.getByText('5', { exact: true })).toBeVisible();
  });
});
