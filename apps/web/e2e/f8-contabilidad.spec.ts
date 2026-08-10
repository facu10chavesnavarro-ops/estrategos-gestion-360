import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { gotoAndSettle, reloadAndSettle, loginAsAdmin } from './helpers';

/**
 * Selecciona una opción de un <Select> ubicado dentro del mismo FormItem
 * que una FormLabel con texto exacto `label` — mismo helper que
 * f5/f6/f7. Solo sirve para el ÚNICO combobox visible con ese label (ej.
 * la línea 0 del alta de asiento manual, que es la única con FormLabel).
 */
async function selectByLabel(page: Page, label: string, optionName: string | RegExp) {
  await page.getByText(label, { exact: true }).locator('xpath=..').getByRole('combobox').click();
  await page.getByRole('option', { name: optionName }).click();
}

/** Fila de una cuenta en el árbol del Plan de Cuentas, ubicada por su código (único, exacto). */
function accountRow(page: Page, code: string) {
  return page.getByRole('link', { name: code, exact: true }).locator('xpath=../..');
}

/**
 * La fila de "Medio" en el formulario de cobro/pago (F6) no tiene
 * FormLabel propio — mismo helper que f6/f7. El selector de contraparte
 * (Cliente/Proveedor) SÍ es un combobox propio más arriba en la misma
 * página, así que no se puede ubicar "Medio" por posición global.
 */
function medioRow(page: Page, index: number) {
  const table = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Medio' }) });
  return table.getByRole('row').nth(index + 1);
}
async function selectMedio(page: Page, rowIndex: number, methodName: string) {
  await medioRow(page, rowIndex).getByRole('combobox').click();
  await page.getByRole('option', { name: methodName }).click();
}
async function fillMedioAmount(page: Page, rowIndex: number, amount: string) {
  await medioRow(page, rowIndex).locator('input[inputmode="decimal"]').fill(amount);
}

/**
 * Línea `index` del alta de asiento manual: solo la línea 0 tiene
 * FormLabel visible (journal-entry-form.tsx), así que las demás se
 * ubican por posición — hay exactamente un combobox y dos inputs
 * `inputmode="decimal"` (débito, crédito) por línea, en orden.
 */
async function fillJournalLine(page: Page, index: number, accountName: string | RegExp, debit: string, credit: string) {
  await page.getByRole('combobox').nth(index).click();
  await page.getByRole('option', { name: accountName }).click();
  const decimals = page.locator('input[inputmode="decimal"]');
  if (debit) await decimals.nth(index * 2).fill(debit);
  if (credit) await decimals.nth(index * 2 + 1).fill(credit);
}

/**
 * El proxy BFF solo reenvía X-Company-Id si el propio request lo trae —
 * page.request no lo agrega solo a diferencia del navegador. Mismo
 * helper que f6/f7.
 */
function apiGet(page: Page, companyId: string, path: string) {
  return page.request.get(`/api/backend/${path}`, { headers: { 'X-Company-Id': companyId } });
}
function apiPost(page: Page, companyId: string, path: string, data?: unknown) {
  return page.request.post(`/api/backend/${path}`, { data, headers: { 'X-Company-Id': companyId } });
}

function formatMoneyEs(n: number): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2 });
}

/** Mismo criterio que waitForPendingVouchersLoaded (f6) / waitForLoaded (f7). */
async function waitForLoaded(page: Page) {
  await expect(page.getByText('Cargando…')).toHaveCount(0, { timeout: 20_000 });
}

test.describe('Sprint F8 — Contabilidad', () => {
  test.describe.configure({ timeout: 600_000 });

  test('activación → Plan de Cuentas → asiento manual balanceado/desbalanceado → Libro Diario/Mayor → reversión → asientos automáticos de venta/cobro/compra/pago → persistencia', async ({
    page,
  }) => {
    const companyId = await loginAsAdmin(page);
    const stamp = Date.now();

    // ================================================================
    // Activación de Contabilidad — defensiva: si otra corrida (o un
    // reintento de este mismo test) ya la activó, se salta el alta de
    // la UI y se sigue directo (idempotente, mismo criterio que el
    // cierre defensivo de sesiones abiertas en f7-caja-bancos.spec.ts).
    // Dado que este es el último spec alfabético de la suite (después
    // de f7), no hay riesgo de que activar Contabilidad acá rompa un
    // spec posterior que dependa de que esté inactiva.
    // ================================================================
    const settingsRes = await apiGet(page, companyId, `companies/${companyId}/accounting-settings`);
    const alreadyActive = settingsRes.ok();

    await gotoAndSettle(page, `/${companyId}/contabilidad/configuracion`);
    if (!alreadyActive) {
      await expect(page.getByRole('button', { name: 'Activar Contabilidad' }).first()).toBeVisible({
        timeout: 15_000,
      });
      await page.getByRole('button', { name: 'Activar Contabilidad' }).first().click();
      await page.getByRole('dialog').getByRole('button', { name: 'Activar' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
    }
    await expect(page.getByText('Cuentas de control')).toBeVisible({ timeout: 15_000 });

    // --- Plan de Cuentas clonado: 18 cuentas estándar ---
    const accountsRes = await apiGet(page, companyId, `companies/${companyId}/chart-of-accounts`);
    const accountsBefore = await accountsRes.json();
    expect(accountsBefore.length).toBeGreaterThanOrEqual(18);

    // --- Rechazo: activar de nuevo (RN de configuración inválida) ---
    const reactivateRes = await apiPost(page, companyId, `companies/${companyId}/accounting-settings/activate`);
    expect(reactivateRes.ok()).toBe(false);
    expect(reactivateRes.status()).toBe(400);
    expect((await reactivateRes.json()).message).toContain('ya tiene Contabilidad activada');

    // ================================================================
    // Plan de Cuentas: crear cuentas + subcuenta + validar jerarquía.
    // ================================================================
    const codeA = `9.1.${stamp}`;
    const nameA = `Cuenta E2E Débito ${stamp}`;
    const codeB = `9.2.${stamp}`;
    const nameB = `Cuenta E2E Crédito ${stamp}`;
    const codeGroup = `9.3.${stamp}`;
    const nameGroup = `Grupo E2E ${stamp}`;
    const codeSub = `9.3.01.${stamp}`;
    const nameSub = `Subcuenta E2E ${stamp}`;
    const codeSales = `9.4.${stamp}`;
    const nameSales = `Ventas E2E ${stamp}`;
    const codePurchases = `9.5.${stamp}`;
    const namePurchases = `Compras E2E ${stamp}`;
    const codeCash = `9.6.${stamp}`;
    const nameCash = `Caja Contable E2E ${stamp}`;

    async function createAccount(code: string, name: string, type: string, imputable: boolean) {
      await page.getByRole('button', { name: '+ Nueva cuenta' }).click();
      const sheet = page.getByRole('dialog');
      await sheet.getByLabel('Código').fill(code);
      await sheet.getByLabel('Nombre').fill(name);
      await selectByLabel(page, 'Tipo', type);
      if (!imputable) {
        // Único checkbox del sheet (label y checkbox no son hermanos en el
        // DOM de ChartOfAccountSheet — a diferencia de ItemSheet — así que
        // no hace falta ni conviene anclarlo al texto del label).
        await sheet.getByRole('checkbox').click();
      }
      await sheet.getByRole('button', { name: 'Crear cuenta' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
      await expect(accountRow(page, code)).toBeVisible({ timeout: 10_000 });
    }

    await gotoAndSettle(page, `/${companyId}/contabilidad/plan-de-cuentas`);
    await createAccount(codeA, nameA, 'Egreso', true);
    await createAccount(codeB, nameB, 'Activo', true);
    await createAccount(codeGroup, nameGroup, 'Activo', false);
    await expect(accountRow(page, codeGroup).getByText('Agrupadora')).toBeVisible();
    await createAccount(codeSales, nameSales, 'Ingreso', true);
    await createAccount(codePurchases, namePurchases, 'Egreso', true);
    await createAccount(codeCash, nameCash, 'Activo', true);

    // --- Subcuenta bajo el grupo, vía "+ Subcuenta" (precarga el padre) ---
    await accountRow(page, codeGroup).getByRole('button', { name: 'Subcuenta' }).click();
    const subSheet = page.getByRole('dialog');
    await subSheet.getByLabel('Código').fill(codeSub);
    await subSheet.getByLabel('Nombre').fill(nameSub);
    await selectByLabel(page, 'Tipo', 'Activo');
    await subSheet.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });

    // --- Validar jerarquía: el detalle de la subcuenta muestra el padre ---
    // Navegación directa por href (en vez de click+waitForURL): la fila ya
    // tiene el id en el propio link, y evita depender de que el router de
    // Next detecte el cambio de URL a tiempo para waitForURL.
    const subHref = await page.getByRole('link', { name: codeSub, exact: true }).getAttribute('href');
    await gotoAndSettle(page, subHref as string);
    await expect(page.getByText(`Padre: ${codeGroup}`)).toBeVisible({ timeout: 15_000 });
    const accountIdSub = (subHref ?? '').split('/').pop() as string;

    // Ids de las cuentas creadas (para el asiento manual y la reversión).
    const allAccounts = await (await apiGet(page, companyId, `companies/${companyId}/chart-of-accounts`)).json();
    const accountIdA = allAccounts.find((a: { code: string }) => a.code === codeA).id;
    const accountIdB = allAccounts.find((a: { code: string }) => a.code === codeB).id;

    // ================================================================
    // Asiento manual balanceado.
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/contabilidad/asientos/nuevo`);
    const conceptoManual = `Asiento manual E2E ${stamp}`;
    await page.getByLabel('Concepto').fill(conceptoManual);
    await fillJournalLine(page, 0, new RegExp(nameA), '500', '');
    await fillJournalLine(page, 1, new RegExp(nameB), '', '500');
    await expect(page.getByRole('button', { name: 'Confirmar asiento' })).toBeEnabled({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Confirmar asiento' }).click();
    await page.waitForURL(/\/contabilidad\/asientos\/[0-9a-f-]+$/, { timeout: 20_000 });
    const manualEntryId = page.url().split('/').pop() as string;
    await expect(page.getByText(conceptoManual)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Manual').first()).toBeVisible();
    await expect(page.getByText(formatMoneyEs(500)).first()).toBeVisible();

    // --- Rechazo: asiento desbalanceado (verificado a nivel API, defensa
    // en profundidad — la UI ya ni deja habilitar el botón). ---
    const unbalancedRes = await apiPost(page, companyId, `companies/${companyId}/journal-entries`, {
      description: 'Asiento desbalanceado E2E',
      lines: [
        { accountId: accountIdA, debit: '500', credit: '0' },
        { accountId: accountIdB, debit: '0', credit: '400' },
      ],
    });
    expect(unbalancedRes.ok()).toBe(false);
    expect(unbalancedRes.status()).toBe(400);
    expect((await unbalancedRes.json()).message).toContain('no está balanceado');

    // ================================================================
    // Libro Diario: el asiento manual aparece en el listado.
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/contabilidad/asientos`);
    await expect(page.getByRole('table').getByText(conceptoManual)).toBeVisible({ timeout: 15_000 });

    // ================================================================
    // Libro Mayor de la cuenta A: movimiento + saldo acumulado (calculado
    // por el backend, se muestra tal cual — F8 §2.2).
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/contabilidad/libro-mayor`);
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: new RegExp(nameA) }).click();
    const ledgerTable = page.getByRole('table');
    await expect(ledgerTable.getByText(conceptoManual)).toBeVisible({ timeout: 15_000 });
    const ledgerRow = ledgerTable.locator('tr', { hasText: conceptoManual });
    await expect(ledgerRow.getByText(formatMoneyEs(500)).first()).toBeVisible();

    // ================================================================
    // Reversión del asiento manual + rechazo de doble reversión.
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/contabilidad/asientos/${manualEntryId}`);
    await page.getByRole('button', { name: 'Revertir' }).click();
    // Origin MANUAL: sin la advertencia de "no anula la operación de origen".
    await expect(page.getByText('no anula ni modifica esa operación')).toHaveCount(0);
    await page.getByRole('dialog').getByRole('button', { name: 'Revertir' }).click();
    // No se usa waitForURL con un patrón genérico acá: la URL de origen ya
    // matchea el mismo patrón que la de destino (ambas son
    // /asientos/{id}), así que resolvería de inmediato sin esperar la
    // navegación real. Se espera contenido exclusivo de la página nueva.
    await expect(page.getByText(`Reversión de: ${conceptoManual}`)).toBeVisible({ timeout: 20_000 });
    expect(page.url().endsWith(manualEntryId)).toBe(false);

    await gotoAndSettle(page, `/${companyId}/contabilidad/asientos/${manualEntryId}`);
    await expect(page.getByText('Revertido')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Revertir' })).toHaveCount(0);

    const doubleReverseRes = await apiPost(
      page,
      companyId,
      `companies/${companyId}/journal-entries/${manualEntryId}/reverse`,
    );
    expect(doubleReverseRes.ok()).toBe(false);
    expect(doubleReverseRes.status()).toBe(400);
    expect((await doubleReverseRes.json()).message).toContain('ya fue revertido');

    // ================================================================
    // Mapeo contable (F8 §3.8): categoría de ventas/compras, retrofit F3.
    // ================================================================
    const categoryName = `Categoría E2E Contable ${stamp}`;
    await gotoAndSettle(page, `/${companyId}/catalogo/categorias`);
    await page.getByRole('button', { name: '+ Nueva categoría' }).click();
    await page.getByLabel('Nombre').fill(categoryName);
    await page.getByRole('button', { name: 'Crear categoría' }).click();
    await expect(page.getByText(categoryName)).toBeVisible({ timeout: 15_000 });
    // El nombre y los botones son hermanos dos niveles arriba (mismo
    // criterio que accountRow): CategoryNode envuelve [nombre+badge] y
    // [botones] como hijos directos de la fila.
    await page
      .getByText(categoryName, { exact: true })
      .locator('xpath=../..')
      .getByRole('button', { name: 'Editar' })
      .click();
    await selectByLabel(page, 'Cuenta de ventas', new RegExp(nameSales));
    await selectByLabel(page, 'Cuenta de compras', new RegExp(namePurchases));
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });

    // --- Servicio sin impuesto (evita necesitar mapeo de impuestos) ---
    const serviceName = `Servicio E2E Contable ${stamp}`;
    const serviceSku = `SKU-ACC-${stamp}`;
    await gotoAndSettle(page, `/${companyId}/catalogo/servicios`);
    await page.getByRole('button', { name: '+ Nuevo servicio' }).click();
    let sheet = page.getByRole('dialog');
    await sheet.getByLabel('SKU').fill(serviceSku);
    await sheet.getByLabel('Nombre').fill(serviceName);
    await sheet.getByLabel('Unidad de medida').fill('unidad');
    await selectByLabel(page, 'Categoría', categoryName);
    await sheet.getByRole('button', { name: 'Crear servicio' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });

    // --- Cliente, proveedor, punto de venta ---
    const customerName = `Cliente E2E Contable ${stamp}`;
    await gotoAndSettle(page, `/${companyId}/clientes`);
    await page.getByRole('button', { name: '+ Nuevo cliente' }).click();
    await page.getByLabel('Razón social').fill(customerName);
    await page.getByRole('button', { name: 'Crear cliente' }).click();
    await expect(page.getByRole('table').getByText(customerName)).toBeVisible({ timeout: 10_000 });
    const customerPartyId = (
      await (
        await apiGet(page, companyId, `companies/${companyId}/customers?search=${encodeURIComponent(customerName)}`)
      ).json()
    )[0].partyId as string;

    const supplierName = `Proveedor E2E Contable ${stamp}`;
    await gotoAndSettle(page, `/${companyId}/proveedores`);
    await page.getByRole('button', { name: '+ Nuevo proveedor' }).click();
    await page.getByLabel('Razón social').fill(supplierName);
    await page.getByRole('button', { name: 'Crear proveedor' }).click();
    await expect(page.getByRole('table').getByText(supplierName)).toBeVisible({ timeout: 10_000 });
    const supplierPartyId = (
      await (
        await apiGet(page, companyId, `companies/${companyId}/suppliers?search=${encodeURIComponent(supplierName)}`)
      ).json()
    )[0].partyId as string;

    const posCode = `PV-ACC-${stamp}`;
    const posName = `Punto de venta E2E Contable ${stamp}`;
    await gotoAndSettle(page, `/${companyId}/comprobantes/puntos-de-venta`);
    await page.getByRole('button', { name: '+ Nuevo punto de venta' }).click();
    sheet = page.getByRole('dialog');
    await sheet.getByLabel('Código').fill(posCode);
    await sheet.getByLabel('Nombre').fill(posName);
    await sheet.getByRole('combobox').click();
    await page.getByRole('option').first().click();
    await sheet.getByRole('button', { name: 'Crear punto de venta' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });

    // ================================================================
    // Asiento automático de venta.
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/comprobantes/nuevo/venta`);
    await expect(page.getByText('Tipo de comprobante')).toBeVisible({ timeout: 20_000 });
    await selectByLabel(page, 'Tipo de comprobante', 'Factura A');
    await selectByLabel(page, 'Cliente', customerName);
    await selectByLabel(page, 'Punto de venta', new RegExp(posCode));
    let rows = page.getByRole('table').getByRole('row');
    await rows.nth(1).getByRole('combobox').click();
    await page.getByRole('option', { name: new RegExp(serviceSku) }).click();
    await rows.nth(1).locator('input[inputmode="decimal"]').nth(0).fill('1');
    await rows.nth(1).locator('input[inputmode="decimal"]').nth(1).fill('1000');
    await page.getByRole('button', { name: 'Confirmar comprobante' }).click();
    await page.waitForURL(/\/comprobantes\/[0-9a-f-]+$/, { timeout: 30_000 });
    const saleVoucherId = page.url().split('/').pop() as string;
    await expect(page.locator('h1').last()).toContainText('N.º', { timeout: 20_000 });

    const ventaEntryLink = page.getByRole('link', { name: 'Ver asiento contable →' });
    await expect(ventaEntryLink).toBeVisible({ timeout: 15_000 });
    await ventaEntryLink.click();
    await page.waitForURL(/\/contabilidad\/asientos\/[0-9a-f-]+$/, { timeout: 15_000 });
    const ventaEntryId = page.url().split('/').pop() as string;
    await expect(page.getByRole('link', { name: 'Ver comprobante de origen →' })).toHaveAttribute(
      'href',
      `/${companyId}/comprobantes/${saleVoucherId}`,
    );

    // ================================================================
    // Caja mapeada (retrofit F7 §3.9) + asiento automático de cobro.
    // ================================================================
    const cashRegisterName = `Caja E2E Contable ${stamp}`;
    await gotoAndSettle(page, `/${companyId}/caja-bancos/caja`);
    await waitForLoaded(page);
    await page.getByRole('button', { name: '+ Nueva caja' }).click();
    sheet = page.getByRole('dialog');
    await sheet.getByLabel('Nombre').fill(cashRegisterName);
    await sheet.getByRole('combobox').click();
    await page.getByRole('option').first().click();
    await sheet.getByRole('button', { name: 'Crear caja' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
    const cashRegisterRow = page.locator('tr', { hasText: cashRegisterName });
    const cashRegisterHref = await cashRegisterRow.getByRole('link', { name: cashRegisterName }).getAttribute('href');
    const cashRegisterId = (cashRegisterHref ?? '').split('/').pop() as string;

    // --- Mapear la cuenta contable de la caja (solo disponible al editar). ---
    await cashRegisterRow.getByRole('button', { name: 'Editar' }).click();
    sheet = page.getByRole('dialog');
    await selectByLabel(page, 'Cuenta contable', new RegExp(nameCash));
    await sheet.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });

    await page.getByRole('button', { name: 'Abrir turno' }).click();
    await selectByLabel(page, 'Caja', new RegExp(cashRegisterName));
    await page.getByLabel('Saldo inicial').fill('0');
    await page.getByRole('button', { name: 'Confirmar apertura' }).click();
    await page.waitForURL(/\/sesiones\/[0-9a-f-]+$/, { timeout: 20_000 });

    // --- Cobro en efectivo (sin imputar a un comprobante puntual — el
    // asiento automático se genera igual, la cuenta de control se
    // afecta sea cual sea el estado de imputación). ---
    await gotoAndSettle(page, `/${companyId}/tesoreria/nuevo/cobro?partyId=${customerPartyId}`);
    await selectMedio(page, 0, 'Efectivo');
    await fillMedioAmount(page, 0, '1000');
    await selectByLabel(page, 'Caja', new RegExp(cashRegisterName));
    await page.getByRole('button', { name: 'Confirmar cobro' }).click();
    await page.waitForURL(/\/tesoreria\/cobros-pagos\/[0-9a-f-]+$/, { timeout: 30_000 });
    const collectionPaymentId = page.url().split('/').pop() as string;

    const cobroEntryLink = page.getByRole('link', { name: 'Ver asiento contable →' });
    await expect(cobroEntryLink).toBeVisible({ timeout: 15_000 });
    await cobroEntryLink.click();
    await page.waitForURL(/\/contabilidad\/asientos\/[0-9a-f-]+$/, { timeout: 15_000 });

    // --- Reversión de un asiento AUTOMÁTICO: se advierte, no se confirma
    // (F8 §3.2) — no hace falta ejecutarla para verificar el mensaje. ---
    await page.getByRole('button', { name: 'Revertir' }).click();
    await expect(page.getByText('no anula ni modifica esa operación')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();

    // ================================================================
    // Asiento automático de compra + pago (verificación por API, misma
    // caja ya mapeada — menor costo que repetir todo el recorrido de UI).
    // ================================================================
    const branchesRes = await apiGet(page, companyId, `companies/${companyId}/branches`);
    const branchId = (await branchesRes.json())[0].id as string;
    const posListRes = await apiGet(page, companyId, `companies/${companyId}/branches/${branchId}/points-of-sale`);
    const posId = (await posListRes.json()).find((p: { code: string }) => p.code === posCode).id as string;
    const itemsRes = await apiGet(page, companyId, `companies/${companyId}/items?search=${encodeURIComponent(serviceSku)}`);
    const serviceItemId = (await itemsRes.json())[0].id as string;
    const voucherTypes = await (await apiGet(page, companyId, 'voucher-types')).json();
    const purchaseVoucherTypeId = voucherTypes.find((t: { code: string }) => t.code === 'FC').id as string;
    const paymentMethods = await (await apiGet(page, companyId, 'payment-methods')).json();
    const cashMethodId = paymentMethods.find((m: { code: string }) => m.code === 'EFECTIVO').id as string;
    const sessionsRes = await apiGet(
      page,
      companyId,
      `companies/${companyId}/branches/${branchId}/cash-registers/${cashRegisterId}/sessions`,
    );
    const openSessionId = (await sessionsRes.json()).find((s: { closedAt: string | null }) => s.closedAt === null)
      .id as string;

    const purchaseVoucherRes = await apiPost(page, companyId, `companies/${companyId}/vouchers`, {
      branchId,
      pointOfSaleId: posId,
      voucherTypeId: purchaseVoucherTypeId,
      partyId: supplierPartyId,
      lines: [{ itemId: serviceItemId, description: serviceName, quantity: '1', unitPrice: '400' }],
    });
    expect(purchaseVoucherRes.ok(), await purchaseVoucherRes.text()).toBe(true);
    const purchaseVoucherId = (await purchaseVoucherRes.json()).id as string;

    const paymentRes = await apiPost(page, companyId, `companies/${companyId}/payments`, {
      direction: 'PAYMENT',
      partyId: supplierPartyId,
      methodDetails: [{ paymentMethodId: cashMethodId, amount: '400' }],
      allocations: [{ voucherId: purchaseVoucherId, amountApplied: '400' }],
      cashSessionId: openSessionId,
    });
    expect(paymentRes.ok(), await paymentRes.text()).toBe(true);
    const purchasePaymentId = (await paymentRes.json()).id as string;

    // --- Verificar los cuatro asientos automáticos por API: existen y balancean. ---
    const allEntries = await (await apiGet(page, companyId, `companies/${companyId}/journal-entries`)).json();
    type Entry = { id: string; sourceType: string | null; sourceId: string | null; lines: { debit: string; credit: string }[] };
    function findBySource(sourceType: string, sourceId: string) {
      return (allEntries as Entry[]).find((e) => e.sourceType === sourceType && e.sourceId === sourceId);
    }
    for (const [sourceType, sourceId] of [
      ['VOUCHER', saleVoucherId],
      ['PAYMENT', collectionPaymentId],
      ['VOUCHER', purchaseVoucherId],
      ['PAYMENT', purchasePaymentId],
    ]) {
      const entry = findBySource(sourceType, sourceId);
      expect(entry, `asiento automático de ${sourceType} ${sourceId}`).toBeTruthy();
    }

    // --- Débitos = Créditos en TODOS los asientos confirmados de la empresa. ---
    for (const entry of allEntries as Entry[]) {
      const totalDebit = entry.lines.reduce((sum, l) => sum + Number(l.debit), 0);
      const totalCredit = entry.lines.reduce((sum, l) => sum + Number(l.credit), 0);
      expect(totalDebit, `asiento ${entry.id}`).toBeCloseTo(totalCredit, 2);
    }

    // ================================================================
    // Persistencia tras recargar.
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/contabilidad/asientos/${ventaEntryId}`);
    await reloadAndSettle(page);
    await expect(page.getByRole('link', { name: 'Ver comprobante de origen →' })).toBeVisible({ timeout: 15_000 });

    await gotoAndSettle(page, `/${companyId}/contabilidad/plan-de-cuentas`);
    await reloadAndSettle(page);
    await expect(accountRow(page, codeA)).toBeVisible({ timeout: 15_000 });
    await expect(accountRow(page, codeSub)).toBeVisible();
  });
});
