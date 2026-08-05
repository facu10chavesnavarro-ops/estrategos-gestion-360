import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { gotoAndSettle, reloadAndSettle, loginAsAdmin } from './helpers';

/**
 * Selecciona una opción de un <Select> ubicado dentro del mismo FormItem
 * que una FormLabel con texto exacto `label` — mismo helper que
 * f5-comprobantes.spec.ts, reutilizado acá porque PaymentForm comparte el
 * mismo patrón FormItem+FormLabel+combobox para Cliente/Proveedor/Caja/
 * Cuenta bancaria.
 */
async function selectByLabel(page: Page, label: string, optionName: string | RegExp) {
  await page.getByText(label, { exact: true }).locator('xpath=..').getByRole('combobox').click();
  await page.getByRole('option', { name: optionName }).click();
}

/**
 * La fila de "Medio" dentro de la tabla de Medios de pago no tiene
 * FormLabel propio (a diferencia de Cliente/Caja/Cuenta bancaria) — se
 * ubica por posición dentro de la tabla que tiene el encabezado "Medio".
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
 * usePendingVouchers compone 3 queries (vouchers + voucherTypes +
 * payments) — con varios comprobantes/pagos ya creados puede tardar más
 * que el margen fijo de gotoAndSettle. Esperar a que el texto de carga
 * desaparezca antes de tocar el picker evita una carrera.
 */
async function waitForPendingVouchersLoaded(page: Page) {
  await expect(page.getByText('Cargando comprobantes pendientes…')).toHaveCount(0, {
    timeout: 20_000,
  });
}

/** Tilda el checkbox del comprobante pendiente identificado por su número. */
async function toggleVoucherRow(page: Page, voucherNumber: number) {
  const row = page.locator('tr', { hasText: `N.º ${voucherNumber}` });
  await row.getByRole('checkbox').click();
  return row;
}

async function setAllocationAmount(page: Page, voucherNumber: number, amount: string) {
  const row = page.locator('tr', { hasText: `N.º ${voucherNumber}` });
  await row.locator('input[inputmode="decimal"]').fill(amount);
}

/**
 * El proxy BFF (apps/web/src/app/api/backend/[...path]/route.ts) solo
 * reenvía X-Company-Id si el propio request lo trae — a diferencia del
 * navegador, page.request no lo agrega solo. Sin este header,
 * CompanyContextGuard rechaza cualquier endpoint scoped a empresa.
 */
function apiGet(page: Page, companyId: string, path: string) {
  return page.request.get(`/api/backend/${path}`, { headers: { 'X-Company-Id': companyId } });
}
function apiPost(page: Page, companyId: string, path: string, data: unknown) {
  return page.request.post(`/api/backend/${path}`, { data, headers: { 'X-Company-Id': companyId } });
}

function formatMoneyEs(n: number): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2 });
}

/** Extrae el número de comprobante del <h1> de su página de detalle. */
async function readVoucherNumber(page: Page): Promise<number> {
  await expect(page.locator('h1').last()).toContainText('N.º', { timeout: 20_000 });
  const heading = (await page.locator('h1').last().textContent()) ?? '';
  const n = Number(heading.match(/N\.º (\d+)/)?.[1]);
  expect(Number.isInteger(n)).toBe(true);
  return n;
}

test.describe('Sprint F6 — Tesorería', () => {
  test.describe.configure({ timeout: 600_000 });

  test('setup → cobro total/parcial/múltiple/multi-medio → pago total/parcial → rechazos → idempotencia → caja/banco → persistencia', async ({
    page,
  }) => {
    const companyId = await loginAsAdmin(page);
    const stamp = Date.now();

    // ================================================================
    // Setup: contrapartes, servicio, punto de venta.
    // ================================================================
    const customerName = `Cliente Tesoreria E2E ${stamp}`;
    const inactiveCustomerName = `Cliente Inactivo Tesoreria E2E ${stamp}`;
    const supplierName = `Proveedor Tesoreria E2E ${stamp}`;

    await gotoAndSettle(page, `/${companyId}/clientes`);
    for (const name of [customerName, inactiveCustomerName]) {
      await page.getByRole('button', { name: '+ Nuevo cliente' }).click();
      await page.getByLabel('Razón social').fill(name);
      await page.getByRole('button', { name: 'Crear cliente' }).click();
      await expect(page.getByRole('table').getByText(name)).toBeVisible({ timeout: 10_000 });
    }
    const customersTable = page.getByRole('table');
    const inactiveRow = customersTable.locator('tr', { hasText: inactiveCustomerName });
    await inactiveRow.getByRole('button', { name: 'Desactivar' }).click();
    await expect(page.getByText(`¿Confirmás desactivar a "${inactiveCustomerName}"?`)).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(inactiveRow.getByText('Inactivo', { exact: true })).toBeVisible({ timeout: 10_000 });

    await gotoAndSettle(page, `/${companyId}/proveedores`);
    await page.getByRole('button', { name: '+ Nuevo proveedor' }).click();
    await page.getByLabel('Razón social').fill(supplierName);
    await page.getByRole('button', { name: 'Crear proveedor' }).click();
    await expect(page.getByRole('table').getByText(supplierName)).toBeVisible({ timeout: 10_000 });

    // partyId de cada contraparte — se usa para saltar directo al
    // formulario de cobro/pago con `?partyId=` en vez de repetir la
    // selección del combobox Cliente/Proveedor en cada operación.
    const customersRes = await apiGet(
      page,
      companyId,
      `companies/${companyId}/customers?search=${encodeURIComponent(customerName)}`,
    );
    expect(customersRes.ok()).toBe(true);
    const customerPartyId = (await customersRes.json())[0].partyId as string;

    const suppliersRes = await apiGet(
      page,
      companyId,
      `companies/${companyId}/suppliers?search=${encodeURIComponent(supplierName)}`,
    );
    expect(suppliersRes.ok()).toBe(true);
    const supplierPartyId = (await suppliersRes.json())[0].partyId as string;

    const serviceName = `Servicio Tesoreria E2E ${stamp}`;
    const serviceSku = `SKU-TES-${stamp}`;
    await gotoAndSettle(page, `/${companyId}/catalogo/servicios`);
    await page.getByRole('button', { name: '+ Nuevo servicio' }).click();
    let sheet = page.getByRole('dialog');
    await sheet.getByLabel('SKU').fill(serviceSku);
    await sheet.getByLabel('Nombre').fill(serviceName);
    await sheet.getByLabel('Unidad de medida').fill('unidad');
    await sheet.getByRole('button', { name: 'Crear servicio' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
    await expect(page.getByRole('table').getByText(serviceName)).toBeVisible({ timeout: 10_000 });

    const posCode = `PV-TES-${stamp}`;
    const posName = `Punto de venta Tesoreria E2E ${stamp}`;
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

    // --- Caja abierta + cuenta bancaria activa (RN-PAY-10 exige ambas
    // para medios que requieren movimiento de caja/banco). F6 no tiene
    // pantallas propias para gestionarlas (F7) — se crean por API
    // directo contra el mismo BFF que usa la app. ---
    const branchesRes = await apiGet(page, companyId, `companies/${companyId}/branches`);
    expect(branchesRes.ok()).toBe(true);
    const branchId = (await branchesRes.json())[0].id as string;

    const cashRegisterName = `Caja Tesoreria E2E ${stamp}`;
    const registerRes = await apiPost(
      page,
      companyId,
      `companies/${companyId}/branches/${branchId}/cash-registers`,
      { name: cashRegisterName },
    );
    expect(registerRes.ok()).toBe(true);
    const cashRegisterId = (await registerRes.json()).id as string;

    const sessionRes = await apiPost(
      page,
      companyId,
      `companies/${companyId}/branches/${branchId}/cash-registers/${cashRegisterId}/sessions`,
      { openingBalance: '0' },
    );
    expect(sessionRes.ok()).toBe(true);
    const cashSessionId = (await sessionRes.json()).id as string;

    const bankName = `Banco Tesoreria E2E ${stamp}`;
    const bankRes = await apiPost(page, companyId, `companies/${companyId}/bank-accounts`, {
      bankName,
      accountType: 'CHECKING',
      currency: 'ARS',
    });
    expect(bankRes.ok()).toBe(true);
    const bankAccountId = (await bankRes.json()).id as string;

    // ================================================================
    // Comprobantes pendientes: 4 facturas de venta (cliente) + 2 de
    // compra (proveedor), todas con una sola línea del mismo servicio
    // (sin impuesto ni stock) para que el total sea exactamente el
    // precio de línea.
    // ================================================================
    async function createSaleInvoice(total: number): Promise<number> {
      await gotoAndSettle(page, `/${companyId}/comprobantes/nuevo/venta`);
      await expect(page.getByText('Tipo de comprobante')).toBeVisible({ timeout: 20_000 });
      await selectByLabel(page, 'Tipo de comprobante', 'Factura A');
      await selectByLabel(page, 'Cliente', customerName);
      await selectByLabel(page, 'Punto de venta', new RegExp(posCode));
      const rows = page.getByRole('table').getByRole('row');
      await rows.nth(1).getByRole('combobox').click();
      await page.getByRole('option', { name: new RegExp(serviceSku) }).click();
      await rows.nth(1).locator('input[inputmode="decimal"]').nth(0).fill('1');
      await rows.nth(1).locator('input[inputmode="decimal"]').nth(1).fill(String(total));
      await page.getByRole('button', { name: 'Confirmar comprobante' }).click();
      await page.waitForURL(/\/comprobantes\/[0-9a-f-]+$/, { timeout: 30_000 });
      return readVoucherNumber(page);
    }

    async function createPurchaseInvoice(total: number): Promise<number> {
      await gotoAndSettle(page, `/${companyId}/comprobantes/nuevo/compra`);
      await expect(page.getByText('Proveedor', { exact: true })).toBeVisible({ timeout: 20_000 });
      await selectByLabel(page, 'Proveedor', supplierName);
      await selectByLabel(page, 'Punto de venta', new RegExp(posCode));
      const rows = page.getByRole('table').getByRole('row');
      await rows.nth(1).getByRole('combobox').click();
      await page.getByRole('option', { name: new RegExp(serviceSku) }).click();
      await rows.nth(1).locator('input[inputmode="decimal"]').nth(0).fill('1');
      await rows.nth(1).locator('input[inputmode="decimal"]').nth(1).fill(String(total));
      await page.getByRole('button', { name: 'Confirmar comprobante' }).click();
      await page.waitForURL(/\/comprobantes\/[0-9a-f-]+$/, { timeout: 30_000 });
      return readVoucherNumber(page);
    }

    const v1 = await createSaleInvoice(1000);
    const v2 = await createSaleInvoice(500);
    const v3 = await createSaleInvoice(300);
    const v4 = await createSaleInvoice(400);
    const c1 = await createPurchaseInvoice(700);
    const c2 = await createPurchaseInvoice(500);

    // ================================================================
    // Rechazo: contraparte inactiva ni siquiera aparece como opción.
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/tesoreria/nuevo/cobro`);
    await page.getByText('Cliente', { exact: true }).locator('xpath=..').getByRole('combobox').click();
    await expect(page.getByRole('option', { name: inactiveCustomerName })).toHaveCount(0);
    await expect(page.getByRole('option', { name: customerName })).toBeVisible();
    await page.keyboard.press('Escape');

    // ================================================================
    // Rechazo: importe inválido (cero) en un medio de pago.
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/tesoreria/nuevo/cobro?partyId=${customerPartyId}`);
    await waitForPendingVouchersLoaded(page);
    await selectMedio(page, 0, 'Efectivo');
    await fillMedioAmount(page, 0, '0');
    await page.getByRole('button', { name: 'Confirmar cobro' }).click();
    await expect(page.getByText('Debe ser mayor a cero')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/tesoreria\/nuevo\/cobro/);

    // ================================================================
    // Cobro total (V1 = 1000, Efectivo, caja abierta).
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/tesoreria/nuevo/cobro?partyId=${customerPartyId}`);
    await waitForPendingVouchersLoaded(page);
    await toggleVoucherRow(page, v1);
    await expect(page.getByText('Saldo restante de lo seleccionado')).toBeVisible({ timeout: 10_000 });
    await selectMedio(page, 0, 'Efectivo');
    await fillMedioAmount(page, 0, '1000');
    await selectByLabel(page, 'Caja', new RegExp(cashRegisterName));
    await expect(page.getByText(formatMoneyEs(0)).last()).toBeVisible({ timeout: 10_000 }); // saldo restante
    await page.getByRole('button', { name: 'Confirmar cobro' }).click();
    await page.waitForURL(/\/tesoreria\/cobros-pagos\/[0-9a-f-]+$/, { timeout: 30_000 });
    const p1Url = page.url();
    const p1Id = p1Url.split('/').pop() as string;
    await expect(page.getByText('Efectivo')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(formatMoneyEs(1000)).first()).toBeVisible();
    await expect(page.getByText(new RegExp(`FA_A N\\.º ${v1}\\b`))).toBeVisible();

    // ================================================================
    // Imputación múltiple + multi-medio (V2 = 500 + V3 = 300, Efectivo
    // 500 + Transferencia Bancaria 300 → toca caja Y banco a la vez).
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/tesoreria/nuevo/cobro?partyId=${customerPartyId}`);
    await waitForPendingVouchersLoaded(page);
    await toggleVoucherRow(page, v2);
    await toggleVoucherRow(page, v3);
    await selectMedio(page, 0, 'Efectivo');
    await fillMedioAmount(page, 0, '500');
    await page.getByRole('button', { name: '+ Agregar medio de pago' }).click();
    await selectMedio(page, 1, 'Transferencia Bancaria');
    await fillMedioAmount(page, 1, '300');
    await selectByLabel(page, 'Caja', new RegExp(cashRegisterName));
    await selectByLabel(page, 'Cuenta bancaria', new RegExp(bankName));
    await expect(page.getByText(formatMoneyEs(800)).last()).toBeVisible({ timeout: 10_000 }); // total a cobrar
    await page.getByRole('button', { name: 'Confirmar cobro' }).click();
    await page.waitForURL(/\/tesoreria\/cobros-pagos\/[0-9a-f-]+$/, { timeout: 30_000 });
    const p2Url = page.url();
    const p2Id = p2Url.split('/').pop() as string;
    await expect(page.getByText('Transferencia Bancaria')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(formatMoneyEs(500)).first()).toBeVisible();
    await expect(page.getByText(formatMoneyEs(300)).first()).toBeVisible();
    await expect(page.getByText(new RegExp(`FA_A N\\.º ${v2}\\b`))).toBeVisible();
    await expect(page.getByText(new RegExp(`FA_A N\\.º ${v3}\\b`))).toBeVisible();

    // --- Persistencia tras recargar: el detalle de este cobro
    // multi-medio/multi-imputación se ve igual después de un reload. ---
    await reloadAndSettle(page);
    await expect(page.getByText('Transferencia Bancaria')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(new RegExp(`FA_A N\\.º ${v2}\\b`))).toBeVisible();
    await expect(page.getByText(new RegExp(`FA_A N\\.º ${v3}\\b`))).toBeVisible();

    // ================================================================
    // Cobro parcial (V4 = 400, se cobran solo 250 → quedan 150
    // pendientes en el propio comprobante).
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/tesoreria/nuevo/cobro?partyId=${customerPartyId}`);
    await waitForPendingVouchersLoaded(page);
    await toggleVoucherRow(page, v4);
    await setAllocationAmount(page, v4, '250');
    await expect(page.getByText(formatMoneyEs(150)).last()).toBeVisible({ timeout: 10_000 }); // saldo restante de lo seleccionado
    await selectMedio(page, 0, 'Efectivo');
    await fillMedioAmount(page, 0, '250');
    await selectByLabel(page, 'Caja', new RegExp(cashRegisterName));
    await page.getByRole('button', { name: 'Confirmar cobro' }).click();
    await page.waitForURL(/\/tesoreria\/cobros-pagos\/[0-9a-f-]+$/, { timeout: 30_000 });
    await expect(page.getByText(formatMoneyEs(250)).first()).toBeVisible({ timeout: 15_000 });

    // --- El comprobante V4 sigue pendiente por 150 al reabrir el
    // formulario para la misma contraparte. ---
    await gotoAndSettle(page, `/${companyId}/tesoreria/nuevo/cobro?partyId=${customerPartyId}`);
    await waitForPendingVouchersLoaded(page);
    const v4Row = page.locator('tr', { hasText: `N.º ${v4}` });
    await expect(v4Row.getByText(formatMoneyEs(150))).toBeVisible({ timeout: 10_000 });

    // --- Cuenta corriente del cliente: 1000+500+300+400 (facturas)
    // -1000-800-250 (cobros) = 150 de saldo pendiente. Chequeo aislado
    // por partyId único de este cliente, no afectado por otros specs. ---
    await gotoAndSettle(page, `/${companyId}/clientes`);
    await page.getByRole('link', { name: customerName }).click();
    await page.waitForURL(/\/clientes\/[0-9a-f-]+$/, { timeout: 20_000 });
    await expect(page.getByText(`Saldo: ${formatMoneyEs(150)}`)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Haber').first()).toBeVisible();

    // ================================================================
    // Pago total (C1 = 700, Efectivo).
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/tesoreria/nuevo/pago?partyId=${supplierPartyId}`);
    await waitForPendingVouchersLoaded(page);
    await toggleVoucherRow(page, c1);
    await selectMedio(page, 0, 'Efectivo');
    await fillMedioAmount(page, 0, '700');
    await selectByLabel(page, 'Caja', new RegExp(cashRegisterName));
    await page.getByRole('button', { name: 'Confirmar pago' }).click();
    await page.waitForURL(/\/tesoreria\/cobros-pagos\/[0-9a-f-]+$/, { timeout: 30_000 });
    await expect(page.getByText(formatMoneyEs(700)).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(new RegExp(`FC N\\.º ${c1}\\b`))).toBeVisible();

    // ================================================================
    // Pago parcial (C2 = 500, se pagan solo 300 → quedan 200).
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/tesoreria/nuevo/pago?partyId=${supplierPartyId}`);
    await waitForPendingVouchersLoaded(page);
    await toggleVoucherRow(page, c2);
    await setAllocationAmount(page, c2, '300');
    await selectMedio(page, 0, 'Efectivo');
    await fillMedioAmount(page, 0, '300');
    await selectByLabel(page, 'Caja', new RegExp(cashRegisterName));
    await page.getByRole('button', { name: 'Confirmar pago' }).click();
    await page.waitForURL(/\/tesoreria\/cobros-pagos\/[0-9a-f-]+$/, { timeout: 30_000 });
    await expect(page.getByText(formatMoneyEs(300)).first()).toBeVisible({ timeout: 15_000 });

    // --- Cuenta corriente del proveedor: -700-500 (facturas) +700+300
    // (pagos) = -200 (todavía le debemos 200 de C2). ---
    await gotoAndSettle(page, `/${companyId}/proveedores`);
    await page.getByRole('link', { name: supplierName }).click();
    await page.waitForURL(/\/proveedores\/[0-9a-f-]+$/, { timeout: 20_000 });
    await expect(page.getByText(`Saldo: -${formatMoneyEs(200)}`)).toBeVisible({ timeout: 15_000 });

    // ================================================================
    // Prevención de doble envío — nivel UI: el botón se deshabilita
    // (isSubmitting) apenas se hace click, antes de que la mutación
    // resuelva, así que un segundo click no puede llegar a disparar un
    // segundo submit.
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/tesoreria/nuevo/cobro?partyId=${customerPartyId}`);
    await selectMedio(page, 0, 'Efectivo');
    await fillMedioAmount(page, 0, '10');
    await selectByLabel(page, 'Caja', new RegExp(cashRegisterName));
    const submitBtn = page.getByRole('button', { name: 'Confirmar cobro' });
    await submitBtn.click();
    await expect(page.getByRole('button', { name: 'Guardando…' })).toBeDisabled({ timeout: 5_000 });
    await page.waitForURL(/\/tesoreria\/cobros-pagos\/[0-9a-f-]+$/, { timeout: 30_000 });

    // ================================================================
    // Prevención de doble envío — nivel API: RN-PAY-11. Dos POST con la
    // misma idempotencyKey deben devolver el mismo Payment, sin crear
    // un segundo registro (simula un reintento de red o un doble clic
    // que sí llegara a disparar dos requests).
    // ================================================================
    const methodsRes = await apiGet(page, companyId, `payment-methods`);
    expect(methodsRes.ok()).toBe(true);
    const efectivoId = (await methodsRes.json()).find((m: { code: string }) => m.code === 'EFECTIVO').id;

    const idempotencyKey = `f6-e2e-${stamp}`;
    const replayBody = {
      partyId: customerPartyId,
      direction: 'COLLECTION',
      methodDetails: [{ paymentMethodId: efectivoId, amount: '5' }],
      cashSessionId,
      idempotencyKey,
    };
    const firstReplay = await apiPost(page, companyId, `companies/${companyId}/payments`, replayBody);
    expect(firstReplay.ok()).toBe(true);
    const firstReplayId = (await firstReplay.json()).id as string;

    const secondReplay = await apiPost(page, companyId, `companies/${companyId}/payments`, replayBody);
    expect(secondReplay.ok()).toBe(true);
    const secondReplayId = (await secondReplay.json()).id as string;
    expect(secondReplayId).toBe(firstReplayId);

    const replayListRes = await apiGet(
      page,
      companyId,
      `companies/${companyId}/payments?partyId=${customerPartyId}`,
    );
    const replayList = (await replayListRes.json()) as Array<{ id: string }>;
    expect(replayList.filter((p) => p.id === firstReplayId)).toHaveLength(1);

    // ================================================================
    // Movimiento de caja: la sesión abierta acumula exactamente los
    // ingresos/egresos generados por cada cobro/pago en efectivo.
    // ================================================================
    const cashMovementsRes = await apiGet(
      page,
      companyId,
      `companies/${companyId}/cash-sessions/${cashSessionId}/movements`,
    );
    expect(cashMovementsRes.ok()).toBe(true);
    const cashMovements = (await cashMovementsRes.json()) as Array<{
      paymentId: string | null;
      amount: string;
      type: 'IN' | 'OUT';
    }>;
    expect(
      cashMovements.some((m) => m.paymentId === p1Id && Number(m.amount) === 1000 && m.type === 'IN'),
    ).toBe(true);
    expect(
      cashMovements.some((m) => m.paymentId === p2Id && Number(m.amount) === 500 && m.type === 'IN'),
    ).toBe(true);

    // ================================================================
    // Movimiento bancario: la Transferencia Bancaria del cobro múltiple
    // generó un único DEPOSIT agregado (no uno por comprobante).
    // ================================================================
    const bankMovementsRes = await apiGet(
      page,
      companyId,
      `companies/${companyId}/bank-accounts/${bankAccountId}/movements`,
    );
    expect(bankMovementsRes.ok()).toBe(true);
    const bankMovements = (await bankMovementsRes.json()) as Array<{
      paymentId: string | null;
      amount: string;
      type: 'DEPOSIT' | 'WITHDRAWAL';
    }>;
    expect(
      bankMovements.some((m) => m.paymentId === p2Id && Number(m.amount) === 300 && m.type === 'DEPOSIT'),
    ).toBe(true);

    // ================================================================
    // Listado: ambas contrapartes aparecen en Cobros y pagos.
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/tesoreria/cobros-pagos`);
    const paymentsTable = page.getByRole('table');
    await expect(paymentsTable.getByText(customerName).first()).toBeVisible({ timeout: 20_000 });
    await expect(paymentsTable.getByText(supplierName).first()).toBeVisible();
  });
});
