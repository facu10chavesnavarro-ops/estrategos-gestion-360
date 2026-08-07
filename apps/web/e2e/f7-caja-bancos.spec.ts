import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { gotoAndSettle, reloadAndSettle, loginAsAdmin } from './helpers';

/**
 * Selecciona una opción de un <Select> ubicado dentro del mismo FormItem
 * que una FormLabel con texto exacto `label` — mismo helper que
 * f5-comprobantes.spec.ts/f6-tesoreria.spec.ts, reutilizado acá porque
 * todos los formularios de F7 (CashRegisterSheet, OpenSessionDialog,
 * BankTransferDialog) comparten el mismo patrón FormItem+FormLabel+combobox.
 */
async function selectByLabel(page: Page, label: string, optionName: string | RegExp) {
  await page.getByText(label, { exact: true }).locator('xpath=..').getByRole('combobox').click();
  await page.getByRole('option', { name: optionName }).click();
}

/** La fila de "Medio" en Tesorería (F6) no tiene FormLabel propio. */
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
 * El proxy BFF (apps/web/src/app/api/backend/[...path]/route.ts) solo
 * reenvía X-Company-Id si el propio request lo trae — page.request no lo
 * agrega solo a diferencia del navegador. Mismo helper que f6-tesoreria.spec.ts.
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

/**
 * Las páginas de detalle de caja/sesión/cuenta bancaria componen varias
 * queries (lista de cajas, sesiones, movimientos) y muestran "Cargando…"
 * hasta que todas resuelven — con más datos ya cargados puede tardar más
 * que el margen fijo de gotoAndSettle. Mismo criterio que
 * waitForPendingVouchersLoaded en f6-tesoreria.spec.ts.
 */
async function waitForLoaded(page: Page) {
  await expect(page.getByText('Cargando…')).toHaveCount(0, { timeout: 20_000 });
}

test.describe('Sprint F7 — Caja y Bancos', () => {
  test.describe.configure({ timeout: 600_000 });

  test('rechazo sin caja abierta → alta de caja → apertura → ingreso/egreso → movimiento automático de Tesorería → cierre sin/con diferencia → rechazo de doble apertura → transferencia bancaria → doble envío → persistencia', async ({
    page,
  }) => {
    const companyId = await loginAsAdmin(page);
    const stamp = Date.now();

    // ================================================================
    // Setup: un cliente activo para poder probar un cobro cuenta-a-cuenta
    // (sin comprobantes, no hace falta nada de F5 para este sprint).
    // ================================================================
    const customerName = `Cliente Caja Bancos E2E ${stamp}`;
    await gotoAndSettle(page, `/${companyId}/clientes`);
    await page.getByRole('button', { name: '+ Nuevo cliente' }).click();
    await page.getByLabel('Razón social').fill(customerName);
    await page.getByRole('button', { name: 'Crear cliente' }).click();
    await expect(page.getByRole('table').getByText(customerName)).toBeVisible({ timeout: 10_000 });

    const customersRes = await apiGet(
      page,
      companyId,
      `companies/${companyId}/customers?search=${encodeURIComponent(customerName)}`,
    );
    expect(customersRes.ok()).toBe(true);
    const customerPartyId = (await customersRes.json())[0].partyId as string;

    // --- Cierra cualquier sesión de caja que haya quedado abierta de
    // otro spec (ej. f6-tesoreria.spec.ts no cierra la suya) — la
    // Empresa E2E se comparte entre specs dentro de una corrida completa
    // (un solo reset al principio, en globalSetup), así que el chequeo
    // de "sin caja abierta" de acá abajo necesita partir de un estado
    // realmente limpio sin importar qué corrió antes. ---
    const allBranchesRes = await apiGet(page, companyId, `companies/${companyId}/branches`);
    for (const branch of await allBranchesRes.json()) {
      const registersRes = await apiGet(
        page,
        companyId,
        `companies/${companyId}/branches/${branch.id}/cash-registers`,
      );
      for (const register of await registersRes.json()) {
        const sessionsRes = await apiGet(
          page,
          companyId,
          `companies/${companyId}/branches/${branch.id}/cash-registers/${register.id}/sessions`,
        );
        for (const session of await sessionsRes.json()) {
          if (session.closedAt === null) {
            await apiPost(page, companyId, `companies/${companyId}/cash-sessions/${session.id}/close`, {
              closingBalance: '0',
            });
          }
        }
      }
    }

    // ================================================================
    // Rechazo: cobro en efectivo sin ninguna caja abierta (RN-PAY-10,
    // F6) — se re-verifica que sigue vigente ahora que F7 permite abrir
    // cajas, y que el mensaje enlaza correctamente a Caja y Bancos.
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/tesoreria/nuevo/cobro?partyId=${customerPartyId}`);
    await selectMedio(page, 0, 'Efectivo');
    await expect(page.getByText('No hay ninguna caja abierta.')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('link', { name: 'Abrí una sesión de caja' })).toHaveAttribute(
      'href',
      `/${companyId}/caja-bancos/caja`,
    );

    // ================================================================
    // Alta de caja.
    // ================================================================
    const cashRegisterName = `Caja F7 E2E ${stamp}`;
    await gotoAndSettle(page, `/${companyId}/caja-bancos/caja`);
    await waitForLoaded(page);
    await page.getByRole('button', { name: '+ Nueva caja' }).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByLabel('Nombre').fill(cashRegisterName);
    await sheet.getByRole('combobox').click();
    await page.getByRole('option').first().click();
    await sheet.getByRole('button', { name: 'Crear caja' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
    const cashRegisterRow = page.locator('tr', { hasText: cashRegisterName });
    await expect(cashRegisterRow).toBeVisible({ timeout: 10_000 });
    await expect(cashRegisterRow.getByText('Cerrada')).toBeVisible();

    const cashRegisterHref = await cashRegisterRow.getByRole('link', { name: cashRegisterName }).getAttribute('href');
    const cashRegisterId = (cashRegisterHref ?? '').split('/').pop() as string;

    // ================================================================
    // Apertura de turno (desde el listado: elegir caja → saldo inicial → confirmar).
    // ================================================================
    await page.getByRole('button', { name: 'Abrir turno' }).click();
    await selectByLabel(page, 'Caja', new RegExp(cashRegisterName));
    await page.getByLabel('Saldo inicial').fill('1000');
    await page.getByRole('button', { name: 'Confirmar apertura' }).click();
    await page.waitForURL(/\/caja-bancos\/caja\/[0-9a-f-]+\/sesiones\/[0-9a-f-]+$/, { timeout: 20_000 });
    const sessionUrl = page.url();
    const cashSessionId = sessionUrl.split('/').pop() as string;
    await expect(page.getByText('Abierta')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('1.000,00').first()).toBeVisible();

    // ================================================================
    // Rechazo de una segunda apertura sobre la misma caja (RN-CASH-02) —
    // verificado a nivel API directo (defensa en profundidad, la UI ya
    // ni siquiera ofrece la caja como opción una vez que tiene sesión
    // abierta): mismo criterio que el replay de idempotencyKey en F6.
    // ================================================================
    const branchesRes = await apiGet(page, companyId, `companies/${companyId}/branches`);
    const branchId = (await branchesRes.json())[0].id as string;
    const secondOpenRes = await apiPost(
      page,
      companyId,
      `companies/${companyId}/branches/${branchId}/cash-registers/${cashRegisterId}/sessions`,
      { openingBalance: '50' },
    );
    expect(secondOpenRes.ok()).toBe(false);
    expect(secondOpenRes.status()).toBe(400);
    const secondOpenBody = await secondOpenRes.json();
    expect(secondOpenBody.message).toContain('ya tiene una sesión abierta');

    // ================================================================
    // Ingreso y egreso manuales.
    // ================================================================
    await page.getByRole('button', { name: '+ Ingreso' }).click();
    await page.getByLabel('Importe').fill('200');
    await page.getByLabel('Motivo').fill('Ingreso manual E2E F7');
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByText('1.200,00').first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: '+ Egreso' }).click();
    await page.getByLabel('Importe').fill('50');
    await page.getByLabel('Motivo').fill('Egreso manual E2E F7');
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByText('1.150,00').first()).toBeVisible({ timeout: 10_000 });

    // ================================================================
    // Alta de cuenta bancaria.
    // ================================================================
    const bankName = `Banco F7 E2E ${stamp}`;
    await gotoAndSettle(page, `/${companyId}/caja-bancos/bancos`);
    await waitForLoaded(page);
    await page.getByRole('button', { name: '+ Nueva cuenta' }).click();
    const bankSheet = page.getByRole('dialog');
    await bankSheet.getByLabel('Banco').fill(bankName);
    await bankSheet.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
    const bankRow = page.locator('tr', { hasText: bankName });
    await expect(bankRow).toBeVisible({ timeout: 10_000 });
    const bankHref = await bankRow.getByRole('link', { name: new RegExp(bankName) }).getAttribute('href');
    const bankAccountId = (bankHref ?? '').split('/').pop() as string;

    // ================================================================
    // Movimiento automático desde Tesorería: un cobro cuenta-a-cuenta
    // con Efectivo (toca la caja) + Transferencia Bancaria (toca el
    // banco) a la vez — RN-PAY-10, ya construido en F6.
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/tesoreria/nuevo/cobro?partyId=${customerPartyId}`);
    await selectMedio(page, 0, 'Efectivo');
    await fillMedioAmount(page, 0, '300');
    await page.getByRole('button', { name: '+ Agregar medio de pago' }).click();
    await selectMedio(page, 1, 'Transferencia Bancaria');
    await fillMedioAmount(page, 1, '150');
    await selectByLabel(page, 'Caja', new RegExp(cashRegisterName));
    await selectByLabel(page, 'Cuenta bancaria', new RegExp(bankName));
    await page.getByRole('button', { name: 'Confirmar cobro' }).click();
    await page.waitForURL(/\/tesoreria\/cobros-pagos\/[0-9a-f-]+$/, { timeout: 30_000 });
    const paymentId = page.url().split('/').pop() as string;

    // --- Confirmar a nivel API que el pago generó los movimientos
    // automáticos esperados (fuente de verdad, antes de depender de que
    // la UI recomponga sus queries a tiempo). ---
    const cashMovementsAfterPaymentRes = await apiGet(
      page,
      companyId,
      `companies/${companyId}/cash-sessions/${cashSessionId}/movements`,
    );
    const cashMovementsAfterPayment = await cashMovementsAfterPaymentRes.json();
    expect(
      cashMovementsAfterPayment.some((m: { paymentId: string; amount: string }) => m.paymentId === paymentId && Number(m.amount) === 300),
    ).toBe(true);
    const bankMovementsAfterPaymentRes = await apiGet(
      page,
      companyId,
      `companies/${companyId}/bank-accounts/${bankAccountId}/movements`,
    );
    const bankMovementsAfterPayment = await bankMovementsAfterPaymentRes.json();
    expect(
      bankMovementsAfterPayment.some((m: { paymentId: string; amount: string }) => m.paymentId === paymentId && Number(m.amount) === 150),
    ).toBe(true);

    // --- Verificar el movimiento automático en la sesión de caja (UI). ---
    await gotoAndSettle(page, `/${companyId}/caja-bancos/caja/${cashRegisterId}/sesiones/${cashSessionId}`);
    await waitForLoaded(page);
    await expect(page.getByText('1.450,00').first()).toBeVisible({ timeout: 20_000 }); // 1150 + 300
    await expect(
      page.getByRole('link', { name: new RegExp(`Cobro/pago ${paymentId.slice(0, 8)}`) }),
    ).toBeVisible();

    // --- Verificar el movimiento automático en la cuenta bancaria. ---
    await gotoAndSettle(page, `/${companyId}/caja-bancos/bancos/${bankAccountId}`);
    await waitForLoaded(page);
    await expect(page.getByText('150,00').first()).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('link', { name: new RegExp(`Cobro/pago ${paymentId.slice(0, 8)}`) }),
    ).toBeVisible();

    // ================================================================
    // Cierre de sesión sin diferencia.
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/caja-bancos/caja/${cashRegisterId}/sesiones/${cashSessionId}`);
    await waitForLoaded(page);
    await page.getByRole('button', { name: 'Cerrar turno' }).click();
    await page.getByLabel('Saldo contado').fill('1450');
    await expect(page.getByText('Diferencia: ' + formatMoneyEs(0) + ' (sin diferencia)')).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole('button', { name: 'Confirmar cierre' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByText('Cerrada')).toBeVisible({ timeout: 10_000 });
    const differenceLabel = page.getByText('Diferencia', { exact: true });
    await expect(differenceLabel).toBeVisible();
    await expect(differenceLabel.locator('xpath=following-sibling::span[1]')).toHaveText('0,00');

    // ================================================================
    // Reapertura de la misma caja (ya liberada) y cierre CON diferencia.
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/caja-bancos/caja/${cashRegisterId}`);
    await waitForLoaded(page);
    await page.getByRole('button', { name: 'Abrir turno' }).click();
    await page.getByLabel('Saldo inicial').fill('100');
    const openBtn = page.getByRole('button', { name: 'Confirmar apertura' });
    await openBtn.click();
    // --- Prevención de doble envío (UI): el botón queda deshabilitado
    // apenas se hace click, antes de que la mutación resuelva. ---
    await page.waitForURL(/\/sesiones\/[0-9a-f-]+$/, { timeout: 20_000 });

    await page.getByRole('button', { name: 'Cerrar turno' }).click();
    await page.getByLabel('Saldo contado').fill('90');
    await expect(page.getByText('Diferencia: -' + formatMoneyEs(10))).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Confirmar cierre' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByText('-10,00').first()).toBeVisible({ timeout: 10_000 });

    // ================================================================
    // Prevención de doble envío (UI) — un ingreso manual sobre una nueva
    // sesión: el botón se deshabilita apenas se hace click.
    // ================================================================
    await gotoAndSettle(page, `/${companyId}/caja-bancos/caja/${cashRegisterId}`);
    await waitForLoaded(page);
    await page.getByRole('button', { name: 'Abrir turno' }).click();
    await page.getByLabel('Saldo inicial').fill('0');
    await page.getByRole('button', { name: 'Confirmar apertura' }).click();
    await page.waitForURL(/\/sesiones\/[0-9a-f-]+$/, { timeout: 20_000 });

    await page.getByRole('button', { name: '+ Ingreso' }).click();
    await page.getByLabel('Importe').fill('10');
    await page.getByLabel('Motivo').fill('Chequeo de doble envío');
    const confirmBtn = page.getByRole('dialog').getByRole('button', { name: 'Confirmar' });
    await confirmBtn.click();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Guardando…' })).toBeDisabled({
      timeout: 5_000,
    });
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 });

    // ================================================================
    // Transferencia entre cuentas bancarias (F7 §3.2: dos movimientos
    // independientes, sin atomicidad prometida por el backend).
    // ================================================================
    const bankNameTwo = `Banco F7 E2E Dos ${stamp}`;
    await gotoAndSettle(page, `/${companyId}/caja-bancos/bancos`);
    await waitForLoaded(page);
    await page.getByRole('button', { name: '+ Nueva cuenta' }).click();
    await page.getByRole('dialog').getByLabel('Banco').fill(bankNameTwo);
    await page.getByRole('dialog').getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });

    await gotoAndSettle(page, `/${companyId}/caja-bancos/bancos/${bankAccountId}`);
    await waitForLoaded(page);
    await page.getByRole('button', { name: 'Transferir' }).click();
    await selectByLabel(page, 'Cuenta de destino', new RegExp(bankNameTwo));
    await page.getByLabel('Importe').fill('100');
    await page.getByRole('button', { name: 'Confirmar transferencia' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByText('50,00').first()).toBeVisible({ timeout: 10_000 }); // 150 - 100

    await gotoAndSettle(page, `/${companyId}/caja-bancos/bancos`);
    await waitForLoaded(page);
    const bankRowTwo = page.locator('tr', { hasText: bankNameTwo });
    await expect(bankRowTwo.getByText('100,00')).toBeVisible({ timeout: 10_000 });

    // ================================================================
    // Persistencia tras recargar.
    // ================================================================
    await reloadAndSettle(page);
    await expect(bankRowTwo.getByText('100,00')).toBeVisible({ timeout: 10_000 });
    await gotoAndSettle(page, `/${companyId}/caja-bancos/caja/${cashRegisterId}`);
    await waitForLoaded(page);
    await reloadAndSettle(page);
    await expect(page.getByText(cashRegisterName)).toBeVisible({ timeout: 10_000 });
  });
});
