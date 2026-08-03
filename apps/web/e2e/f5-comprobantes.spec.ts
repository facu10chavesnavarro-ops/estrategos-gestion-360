import { test, expect } from '@playwright/test';
import { gotoAndSettle, reloadAndSettle, loginAsAdmin } from './helpers';

/**
 * Selecciona una opción de un <Select> ubicado dentro del mismo FormItem
 * que una FormLabel con texto exacto `label` — mismo idioma que
 * `taxLabel.locator('xpath=..').getByRole('checkbox')` en f3-catalogo.spec.ts,
 * aplicado a comboboxes en vez de checkboxes. Inmune a que otros
 * comboboxes aparezcan/desaparezcan en la página (depósito condicional,
 * comprobante relacionado condicional): no depende de índices globales.
 */
async function selectByLabel(page: import('@playwright/test').Page, label: string, optionName: string | RegExp) {
  await page.getByText(label, { exact: true }).locator('xpath=..').getByRole('combobox').click();
  await page.getByRole('option', { name: optionName }).click();
}

function formatMoneyEs(n: number): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2 });
}

test.describe('Sprint F5 — Comprobantes', () => {
  test.describe.configure({ timeout: 420_000 });

  test('punto de venta + depósito → factura de compra → factura de venta → numeración consecutiva → nota de crédito → rechazos → persistencia', async ({
    page,
  }) => {
    const companyId = await loginAsAdmin(page);
    const stamp = Date.now();

    // --- Cliente activo, cliente que se desactivará, proveedor ---
    const customerName = `Cliente E2E ${stamp}`;
    const inactiveCustomerName = `Cliente Inactivo E2E ${stamp}`;
    const supplierName = `Proveedor E2E ${stamp}`;

    await gotoAndSettle(page, `/${companyId}/clientes`);
    for (const name of [customerName, inactiveCustomerName]) {
      await page.getByRole('button', { name: '+ Nuevo cliente' }).click();
      await page.getByLabel('Razón social').fill(name);
      await page.getByRole('button', { name: 'Crear cliente' }).click();
      await expect(page.getByRole('table').getByText(name)).toBeVisible({ timeout: 10_000 });
    }

    // Se desactiva de inmediato: el selector de contraparte de F5 solo
    // ofrece clientes activos (RN-VOU-04 espejado en el cliente) — la
    // forma real de "rechazar" un cliente inactivo en la UI es que ni
    // siquiera aparezca como opción (verificado más abajo).
    const customersTable = page.getByRole('table');
    const inactiveRow = customersTable.locator('tr', { hasText: inactiveCustomerName });
    await inactiveRow.getByRole('button', { name: 'Desactivar' }).click();
    await expect(page.getByText(`¿Confirmás desactivar a "${inactiveCustomerName}"?`)).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole('button', { name: 'Confirmar' }).click();
    // exact:true — el propio nombre "Cliente Inactivo E2E ..." contiene la
    // substring "Inactivo", además del badge de estado.
    await expect(inactiveRow.getByText('Inactivo', { exact: true })).toBeVisible({ timeout: 10_000 });

    await gotoAndSettle(page, `/${companyId}/proveedores`);
    await page.getByRole('button', { name: '+ Nuevo proveedor' }).click();
    await page.getByLabel('Razón social').fill(supplierName);
    await page.getByRole('button', { name: 'Crear proveedor' }).click();
    await expect(page.getByRole('table').getByText(supplierName)).toBeVisible({ timeout: 10_000 });

    // --- Impuesto (21%) ---
    const taxName = `IVA E2E ${stamp}`;
    await gotoAndSettle(page, `/${companyId}/catalogo/impuestos`);
    await page.getByRole('button', { name: '+ Nuevo impuesto' }).click();
    await page.getByLabel('Nombre').fill(taxName);
    await page.getByLabel('Tasa (%)').fill('21');
    await page.getByRole('button', { name: 'Crear impuesto' }).click();
    await expect(page.getByRole('table').getByText(taxName)).toBeVisible({ timeout: 10_000 });

    // --- Producto que controla stock, con el impuesto ---
    const productName = `Producto Stock E2E ${stamp}`;
    const productSku = `SKU-VOU-${stamp}`;
    await gotoAndSettle(page, `/${companyId}/catalogo/productos`);
    await page.getByRole('button', { name: '+ Nuevo producto' }).click();
    let sheet = page.getByRole('dialog');
    await sheet.getByLabel('SKU').fill(productSku);
    await sheet.getByLabel('Nombre').fill(productName);
    await sheet.getByLabel('Unidad de medida').fill('unidad');
    await sheet.getByText('Controla stock').locator('xpath=..').getByRole('checkbox').click();
    const taxCheckboxLabel = sheet.getByText(`${taxName} (21%)`);
    await taxCheckboxLabel.locator('xpath=..').getByRole('checkbox').click();
    await sheet.getByRole('button', { name: 'Crear producto' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
    await expect(page.getByRole('table').getByText(productName)).toBeVisible({ timeout: 10_000 });

    // --- Servicio (nunca controla stock, sin impuesto) ---
    const serviceName = `Servicio E2E ${stamp}`;
    const serviceSku = `SKU-SRV-${stamp}`;
    await gotoAndSettle(page, `/${companyId}/catalogo/servicios`);
    await page.getByRole('button', { name: '+ Nuevo servicio' }).click();
    sheet = page.getByRole('dialog');
    await sheet.getByLabel('SKU').fill(serviceSku);
    await sheet.getByLabel('Nombre').fill(serviceName);
    await sheet.getByLabel('Unidad de medida').fill('unidad');
    await sheet.getByRole('button', { name: 'Crear servicio' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
    await expect(page.getByRole('table').getByText(serviceName)).toBeVisible({ timeout: 10_000 });

    // --- Punto de venta ---
    const posCode = `PV-${stamp}`;
    const posName = `Punto de venta E2E ${stamp}`;
    await gotoAndSettle(page, `/${companyId}/comprobantes/puntos-de-venta`);
    await page.getByRole('button', { name: '+ Nuevo punto de venta' }).click();
    sheet = page.getByRole('dialog');
    await sheet.getByLabel('Código').fill(posCode);
    await sheet.getByLabel('Nombre').fill(posName);
    await sheet.getByRole('combobox').click();
    await page.getByRole('option').first().click();
    await sheet.getByRole('button', { name: 'Crear punto de venta' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
    await expect(page.getByRole('table').getByText(posName)).toBeVisible({ timeout: 10_000 });

    // --- Depósito ---
    const warehouseName = `Depósito E2E ${stamp}`;
    await gotoAndSettle(page, `/${companyId}/stock/depositos`);
    await page.getByRole('button', { name: '+ Nuevo depósito' }).click();
    sheet = page.getByRole('dialog');
    await sheet.getByLabel('Nombre').fill(warehouseName);
    await sheet.getByRole('combobox').click();
    await page.getByRole('option').first().click();
    await sheet.getByRole('button', { name: 'Crear depósito' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
    await expect(page.getByRole('table').getByText(warehouseName)).toBeVisible({ timeout: 10_000 });

    // ================================================================
    // Factura de Compra: repone 50 unidades del producto + 1 servicio.
    // Subtotal 5000 + 200 = 5200; impuesto solo sobre el producto:
    // 5000*0.21=1050; total 6250.
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/comprobantes/nuevo/compra`);
    await expect(page.getByText('Proveedor', { exact: true })).toBeVisible({ timeout: 20_000 });

    await selectByLabel(page, 'Proveedor', supplierName);
    await selectByLabel(page, 'Punto de venta', new RegExp(posCode));

    let rows = page.getByRole('table').getByRole('row');
    await rows.nth(1).getByRole('combobox').click();
    await page.getByRole('option', { name: new RegExp(productSku) }).click();
    await rows.nth(1).locator('input[inputmode="decimal"]').nth(0).fill('50');
    await rows.nth(1).locator('input[inputmode="decimal"]').nth(1).fill('100');

    await selectByLabel(page, 'Depósito', new RegExp(warehouseName));

    await page.getByRole('button', { name: '+ Agregar línea' }).click();
    rows = page.getByRole('table').getByRole('row');
    await rows.nth(2).getByRole('combobox').click();
    await page.getByRole('option', { name: new RegExp(serviceSku) }).click();
    await rows.nth(2).locator('input[inputmode="decimal"]').nth(0).fill('1');
    await rows.nth(2).locator('input[inputmode="decimal"]').nth(1).fill('200');

    await page.getByRole('button', { name: 'Confirmar comprobante' }).click();
    await page.waitForURL(/\/comprobantes\/[0-9a-f-]+$/, { timeout: 30_000 });
    await expect(page.locator('h1').last()).toContainText('N.º', { timeout: 20_000 });
    await expect(page.getByText(formatMoneyEs(5200))).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(formatMoneyEs(1050))).toBeVisible();
    await expect(page.getByText(formatMoneyEs(6250))).toBeVisible();

    // --- Verificar stock repuesto: 50 unidades en el depósito ---
    await gotoAndSettle(page, `/${companyId}/stock/depositos`);
    await reloadAndSettle(page);
    await page.getByRole('link', { name: warehouseName }).click();
    await page.waitForURL(/\/stock\/depositos\/[0-9a-f-]+$/, { timeout: 25_000 });
    await page.waitForTimeout(800);
    let stockTable = page.getByRole('table').filter({ hasText: 'Costo promedio' });
    await expect(stockTable.getByText(productName)).toBeVisible({ timeout: 20_000 });
    await expect(stockTable.getByText('50', { exact: true })).toBeVisible();

    // ================================================================
    // Factura de Venta N.º 1: 10 unidades del producto.
    // Subtotal 1500, impuesto 315, total 1815.
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/comprobantes/nuevo/venta`);
    await expect(page.getByText('Tipo de comprobante')).toBeVisible({ timeout: 20_000 });

    await selectByLabel(page, 'Tipo de comprobante', 'Factura A');
    await selectByLabel(page, 'Cliente', customerName);
    await selectByLabel(page, 'Punto de venta', new RegExp(posCode));

    rows = page.getByRole('table').getByRole('row');
    await rows.nth(1).getByRole('combobox').click();
    await page.getByRole('option', { name: new RegExp(productSku) }).click();
    await rows.nth(1).locator('input[inputmode="decimal"]').nth(0).fill('10');
    await rows.nth(1).locator('input[inputmode="decimal"]').nth(1).fill('150');

    await selectByLabel(page, 'Depósito', new RegExp(warehouseName));

    await page.getByRole('button', { name: 'Confirmar comprobante' }).click();
    await page.waitForURL(/\/comprobantes\/[0-9a-f-]+$/, { timeout: 30_000 });
    const venta1Url = page.url();
    // El detalle muestra "Cargando…" (sin cifras ni <h1> propio) hasta que
    // resuelven sus 6 queries compuestas — esperar el heading real antes
    // de leer montos, mismo criterio que venta2 más abajo.
    await expect(page.locator('h1').last()).toContainText('N.º', { timeout: 20_000 });
    // .last(): con una sola línea, el subtotal de la línea (1500) coincide
    // con el subtotal del comprobante — el resumen de totales va después
    // de la tabla de líneas en el DOM, así que .last() apunta ahí.
    await expect(page.getByText(formatMoneyEs(1500)).last()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(formatMoneyEs(315)).last()).toBeVisible();
    await expect(page.getByText(formatMoneyEs(1815)).last()).toBeVisible();
    // .last(): el layout de Comprobantes también tiene su propio <h1>
    // ("Comprobantes") envolviendo la página — el de la página de detalle
    // va después en el DOM.
    const venta1Heading = (await page.locator('h1').last().textContent()) ?? '';
    const venta1Number = Number(venta1Heading.match(/N\.º (\d+)/)?.[1]);
    expect(Number.isInteger(venta1Number)).toBe(true);

    // --- Verificar stock descontado: 40 unidades ---
    await gotoAndSettle(page, `/${companyId}/stock/depositos`);
    await reloadAndSettle(page);
    await page.getByRole('link', { name: warehouseName }).click();
    await page.waitForURL(/\/stock\/depositos\/[0-9a-f-]+$/, { timeout: 25_000 });
    await page.waitForTimeout(800);
    stockTable = page.getByRole('table').filter({ hasText: 'Costo promedio' });
    await expect(stockTable.getByText(productName)).toBeVisible({ timeout: 20_000 });
    await expect(stockTable.getByText('40', { exact: true })).toBeVisible();

    // ================================================================
    // Factura de Venta N.º 2: solo el servicio (no afecta stock) — sirve
    // para verificar numeración consecutiva del mismo punto de
    // venta+tipo, y que el servicio no toca el depósito.
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/comprobantes/nuevo/venta`);
    await expect(page.getByText('Tipo de comprobante')).toBeVisible({ timeout: 20_000 });

    await selectByLabel(page, 'Tipo de comprobante', 'Factura A');
    await selectByLabel(page, 'Cliente', customerName);
    await selectByLabel(page, 'Punto de venta', new RegExp(posCode));

    rows = page.getByRole('table').getByRole('row');
    await rows.nth(1).getByRole('combobox').click();
    await page.getByRole('option', { name: new RegExp(serviceSku) }).click();
    await rows.nth(1).locator('input[inputmode="decimal"]').nth(0).fill('1');
    await rows.nth(1).locator('input[inputmode="decimal"]').nth(1).fill('50');

    // Solo el servicio en la línea: sin ítem que trackee stock, el
    // formulario no debe pedir depósito.
    await expect(page.getByText('Depósito', { exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Confirmar comprobante' }).click();
    await page.waitForURL(/\/comprobantes\/[0-9a-f-]+$/, { timeout: 30_000 });
    // El detalle muestra "Cargando…" (sin <h1> propio) hasta que resuelven
    // sus 6 queries compuestas — esperar el heading real antes de leerlo,
    // a diferencia de venta1 donde las aserciones de totales ya daban ese
    // margen de forma implícita.
    await expect(page.locator('h1').last()).toContainText('N.º', { timeout: 15_000 });
    const venta2Heading = (await page.locator('h1').last().textContent()) ?? '';
    const venta2Number = Number(venta2Heading.match(/N\.º (\d+)/)?.[1]);
    expect(venta2Number).toBe(venta1Number + 1);

    // ================================================================
    // Nota de Crédito sobre la Factura de Venta N.º 1: repone las 10
    // unidades y reduce la cuenta corriente del cliente.
    // ================================================================
    await gotoAndSettle(page, venta1Url);
    await page.getByRole('button', { name: 'Emitir Nota de Crédito' }).click();
    await page.waitForURL(/\/comprobantes\/nuevo\/venta\?/, { timeout: 15_000 });
    await expect(page.getByText('Comprobante a corregir')).toBeVisible({ timeout: 20_000 });

    await selectByLabel(page, 'Punto de venta', new RegExp(posCode));
    rows = page.getByRole('table').getByRole('row');
    await rows.nth(1).getByRole('combobox').click();
    await page.getByRole('option', { name: new RegExp(productSku) }).click();
    await rows.nth(1).locator('input[inputmode="decimal"]').nth(0).fill('10');
    await rows.nth(1).locator('input[inputmode="decimal"]').nth(1).fill('150');
    await selectByLabel(page, 'Depósito', new RegExp(warehouseName));

    await page.getByRole('button', { name: 'Confirmar comprobante' }).click();
    await page.waitForURL(/\/comprobantes\/[0-9a-f-]+$/, { timeout: 30_000 });
    await expect(page.locator('h1').last()).toContainText('N.º', { timeout: 20_000 });
    await expect(page.getByText('Nota de Crédito')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(formatMoneyEs(1815))).toBeVisible();

    // --- Verificar stock repuesto: de vuelta a 50 ---
    await gotoAndSettle(page, `/${companyId}/stock/depositos`);
    await reloadAndSettle(page);
    await page.getByRole('link', { name: warehouseName }).click();
    await page.waitForURL(/\/stock\/depositos\/[0-9a-f-]+$/, { timeout: 25_000 });
    await page.waitForTimeout(800);
    stockTable = page.getByRole('table').filter({ hasText: 'Costo promedio' });
    await expect(stockTable.getByText(productName)).toBeVisible({ timeout: 20_000 });
    await expect(stockTable.getByText('50', { exact: true })).toBeVisible();

    // ================================================================
    // Rechazo: Factura de Venta con cantidad mayor al stock disponible.
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/comprobantes/nuevo/venta`);
    await expect(page.getByText('Tipo de comprobante')).toBeVisible({ timeout: 20_000 });

    await selectByLabel(page, 'Tipo de comprobante', 'Factura A');
    await selectByLabel(page, 'Cliente', customerName);
    await selectByLabel(page, 'Punto de venta', new RegExp(posCode));

    rows = page.getByRole('table').getByRole('row');
    await rows.nth(1).getByRole('combobox').click();
    await page.getByRole('option', { name: new RegExp(productSku) }).click();
    await rows.nth(1).locator('input[inputmode="decimal"]').nth(0).fill('9999');
    await rows.nth(1).locator('input[inputmode="decimal"]').nth(1).fill('150');
    await selectByLabel(page, 'Depósito', new RegExp(warehouseName));

    await page.getByRole('button', { name: 'Confirmar comprobante' }).click();
    await expect(
      page.getByText('No hay stock suficiente para esta salida en este depósito.'),
    ).toBeVisible({ timeout: 10_000 });
    // Rechazado: seguimos en el formulario, no navegó a ningún detalle.
    await expect(page).toHaveURL(/\/comprobantes\/nuevo\/venta$/);

    // --- Rechazo (a nivel de UI): el cliente inactivo ni siquiera
    // aparece como opción de contraparte ---
    await page.getByText('Cliente', { exact: true }).locator('xpath=..').getByRole('combobox').click();
    await expect(page.getByRole('option', { name: inactiveCustomerName })).toHaveCount(0);
    await expect(page.getByRole('option', { name: customerName })).toBeVisible();
    await page.keyboard.press('Escape');

    // ================================================================
    // Persistencia tras recargar.
    // ================================================================
    await reloadAndSettle(page);
    await gotoAndSettle(page, `/${companyId}/stock/depositos`);
    await reloadAndSettle(page);
    await page.getByRole('link', { name: warehouseName }).click();
    await page.waitForURL(/\/stock\/depositos\/[0-9a-f-]+$/, { timeout: 25_000 });
    await page.waitForTimeout(800);
    stockTable = page.getByRole('table').filter({ hasText: 'Costo promedio' });
    await expect(stockTable.getByText(productName)).toBeVisible({ timeout: 20_000 });
    await expect(stockTable.getByText('50', { exact: true })).toBeVisible();

    await gotoAndSettle(page, `/${companyId}/comprobantes`);
    const vouchersTable = page.getByRole('table');
    // customerName aparece en 3 filas (Venta 1, Venta 2, NC) — .first()
    // evita la violación de modo estricto de Playwright ante múltiples
    // matches; alcanza con confirmar que el listado las trae a todas.
    await expect(vouchersTable.getByText(customerName).first()).toBeVisible({ timeout: 20_000 });
    await expect(vouchersTable.getByText(supplierName).first()).toBeVisible();
    // exact:true: el nombre del tipo "Nota de Crédito A" también
    // contiene la substring "Nota de Crédito" — solo el Badge coincide
    // con el texto exacto.
    await expect(vouchersTable.getByText('Nota de Crédito', { exact: true })).toBeVisible();
  });
});
