# Sprint F6 — Frontend de Tesorería

Construye la UI completa sobre el módulo `treasury` del backend
(`docs/sprint-3/04-tesoreria.md`, `docs/sprint-3/05-caja-bancos.md`, ya
implementados desde los Sprints 3.4/3.5). Sigue la misma metodología,
arquitectura y estándares de F0–F5.

## 1. Alcance

Registro de cobros a clientes y pagos a proveedores (multi-medio,
imputación total/parcial a comprobantes pendientes), listado y detalle
de cobros/pagos, extensión de la cuenta corriente de Clientes/
Proveedores (F2) con comprobantes pendientes y vencidos, vista general
de Tesorería. **F6 no construye las pantallas de gestión de Caja y
Bancos** (abrir/cerrar sesión de caja, movimientos manuales, alta de
cuentas bancarias) — eso es F7; F6 solo consume lo mínimo necesario
para completar un cobro/pago en efectivo o bancario (elegir una sesión
de caja abierta / una cuenta bancaria activa ya existentes).

**Entregable**: módulo de Tesorería completo y operable. E2E: cobro
total de una factura → cobro parcial de otra → pago total de una
factura de compra → pago con múltiples medios (efectivo + transferencia)
imputando dos comprobantes a la vez → verificar saldo pendiente,
movimiento de cuenta corriente, movimiento de caja y de banco →
rechazo de importe inválido/contraparte inactiva/comprobante
sobre-imputado → prevención de doble envío → persistencia tras
recargar.

## 2. Relevamiento del contrato backend (resumen)

Fuente: `docs/sprint-3/04-tesoreria.md` (RN-PAY-01 a 11, RN-CTA-01 a 04)
y `docs/sprint-3/05-caja-bancos.md` (RN-CASH-01 a 08, RN-BANK-01 a 04) +
lectura directa de `apps/api/src/modules/treasury/`.

### 2.1 Entidades

- **`Payment`**: `id, companyId, partyId, direction (COLLECTION|PAYMENT),
  date, currency, exchangeRate, totalAmount, createdByUserId, createdAt,
  idempotencyKey, allocations[], methodDetails[]`. **Inmutable, sin
  campo de estado** — no hay `status`, no hay anulación (§3.5). `partyId`
  es id de `Party`, igual que en `vouchers` — usar
  `customer.partyId`/`supplier.partyId` (F2).
- **`PaymentMethod`**: catálogo global (7 filas... en realidad 6:
  `EFECTIVO, CHEQUE, TRANSFERENCIA, TARJETA_DEBITO, TARJETA_CREDITO,
  CUENTA_CORRIENTE`), con `requiresCheckDetail/requiresCardDetail/
  requiresCashMovement/requiresBankMovement`.
- **`PaymentMethodDetail`**: una línea de medio de pago dentro de un
  `Payment` — `paymentMethodId, amount, reference?, checkDetail?,
  cardDetail?`. Un `Payment` puede tener varias (pago mixto).
- **`PaymentAllocation`**: `voucherId, amountApplied` — 0, 1 o varias por
  `Payment`. Se puede imputar parcialmente; si la suma de medios supera
  lo imputado, el resto queda como saldo en la cuenta corriente (sin fila
  de imputación) — no existe "vuelto en efectivo".
- **`CustomerAccount`/`SupplierAccount`** (+ `Movement`): se crean
  implícitamente al primer movimiento (`upsert`). Convención de signo
  única: `DEBIT` sube el saldo, `CREDIT` lo baja — en ambas cuentas.
  Saldo positivo de `CustomerAccount` = nos deben; saldo negativo de
  `SupplierAccount` = les debemos (una factura de compra lo deja en
  `-1000`, no en `+1000`).
- **`CashSession`** (`isOpen` = `closedAt === null`), **`CashMovement`**
  (`type IN|OUT`, `paymentId?`), **`BankAccount`**, **`BankMovement`**
  (`type DEPOSIT|WITHDRAWAL`, `paymentId?`, `isReconciled` siempre
  `false` — sin conciliación en este alcance).
- **`CheckDetail`**: `number, bankName, dueDate, status` (enum
  `EN_CARTERA|DEPOSITADO|RECHAZADO|COBRADO`). **`dueDate`/`status` son
  solo informativos** — no hay ningún caso de uso para depositar/cobrar/
  rechazar un cheque; queda fijo en `EN_CARTERA` desde que se crea el
  pago (ver §3.6).

### 2.2 Endpoints usados por F6

| Método | Endpoint | Uso |
|---|---|---|
| `GET` | `payment-methods` (sin `[CTX]`) | Catálogo de medios de pago |
| `GET` | `companies/:id/payments?partyId&direction&from&to` | Listado |
| `POST` | `companies/:id/payments` | Alta de cobro/pago (con `idempotencyKey`) |
| `GET` | `companies/:id/payments/:paymentId` | Detalle |
| `GET` | `companies/:id/customers/:customerId/current-account` | Saldo + movimientos (F2) |
| `GET` | `companies/:id/suppliers/:supplierId/current-account` | Ídem proveedor |
| `GET` | `companies/:id/branches/:branchId/cash-registers` | Cajas de una sucursal |
| `GET` | `companies/:id/cash-registers/:id/sessions` (vía `branches/:branchId/cash-registers/:id/sessions`, ver nota) | Sesiones — se filtra la abierta |
| `GET` | `companies/:id/bank-accounts` | Cuentas bancarias activas |
| `GET` | `companies/:id/vouchers?partyId=` | Comprobantes de la contraparte (F5), para derivar pendientes |

**No existe** endpoint de "comprobantes pendientes/vencidos" ni de
"anular pago" ni de acciones sobre `CheckDetail` — ver §3.

### 2.3 Errores (ya en español, se muestran tal cual)

`InvalidPaymentCounterpartyError` (contraparte inactiva, RN-PAY-01),
`EmptyPaymentMethodDetailsError`, `InvalidPaymentMethodError`,
`MissingCheckDetailError`, `AllocationExceedsPaymentAmountError`
(RN-PAY-03), `InvalidAllocationVoucherError` (RN-PAY-04),
`VoucherOverpaidError` (RN-PAY-05 — intentar imputar a un comprobante ya
saldado da este mismo error, no uno de "ya cancelado"),
`MissingCashSessionError`/`InvalidCashSessionError`,
`MissingBankAccountError`/`InvalidBankAccountError` (RN-PAY-10).

### 2.4 Autorización

Idéntico patrón: escritura (`POST /payments`) exige
`ROLES_THAT_CAN_MANAGE_COMPANY`; lectura (listado, detalle, cuenta
corriente, catálogos) abierta a cualquier miembro activo.

## 3. Decisiones técnicas

### 3.1 Idempotencia — escalada, aprobada y **ya resuelta en el backend**

Confirmado durante el relevamiento: `CreatePaymentUseCase` no tenía
ninguna protección contra doble-submit/reintentos — el mismo problema
que `vouchers` en F5, pero con impacto mayor (duplica también el
movimiento real de caja/banco y el asiento contable). El usuario pidió
explícitamente no resolverlo solo deshabilitando botones y aprobó, entre
dos alternativas presentadas, una **idempotency key acotada a
`Payment`** (ver CHANGELOG.md `[1.3.0]`, backend):

- `Payment.idempotencyKey` (opcional, único junto con `companyId`).
- El frontend genera un id por intento de envío (`crypto.randomUUID()`,
  una vez por montaje del formulario, reutilizado en cualquier
  reintento de ese mismo intento) y lo manda en el `POST`.
- Si el backend ya tiene un `Payment` con esa clave, devuelve ese mismo
  pago en vez de crear uno nuevo — sin duplicar imputaciones, cuenta
  corriente, caja/banco ni asiento contable.
- El frontend **además** deshabilita el botón de confirmar durante el
  envío (mismo patrón de F1-F5) — las dos capas son complementarias, no
  redundantes: la del backend cubre reintentos de red reales/refresh a
  mitad de operación/pestañas duplicadas; la del frontend evita
  side-effects visuales innecesarios (doble POST por doble clic antes
  de que el backend responda).

### 3.2 Comprobantes pendientes/vencidos — escalado, aprobado: cálculo en el cliente

El backend no tiene ningún campo de estado ni de vencimiento en
`Voucher`. Aprobado explícitamente calcular en el cliente (mismo
criterio que el total estimado de F5), cruzando:

```
pendiente(voucher) = voucher.total - Σ(amountApplied de todos los
                      Payment.allocations con ese voucherId)
vencido(voucher)   = pendiente(voucher) > 0
                      && (voucher.issueDate + contraparte.paymentTermDays) < hoy
```

Si `paymentTermDays` es `null` (contado), el comprobante **no se
considera vencido** — no hay una fecha de referencia razonable para
derivarla, y tratar "contado" como "vencido desde el día 1" confundiría
más de lo que ayuda. Se documenta como decisión de UX, no como bug.

Esto reemplaza/reutiliza el patrón ya construido en F5
(`useVouchersWithLabels`): un nuevo hook compone `GET vouchers` (por
`partyId`) + `GET payments` (por `partyId`) y calcula el pendiente por
comprobante — sin endpoint nuevo, aceptando que no escala indefinidamente
si el historial de una contraparte crece mucho (documentado como riesgo
en el informe de cierre, no resuelto en este sprint).

### 3.3 Reversión de un Payment — no existe en el backend, fuera de alcance

No hay ningún caso de uso de anulación/reversión de un `Payment` ya
creado (igual que comprobantes en F5, donde la única corrección es una
Nota de Crédito). F6 **no ofrece** ninguna acción de "deshacer un cobro/
pago" — el brief pedía "Reversión cuando el backend la soporte", y hoy
no la soporta. Se documenta como recomendación para F7+ si se detecta
la necesidad real.

### 3.4 Sesión de caja / cuenta bancaria: se seleccionan, no se gestionan

El formulario de cobro/pago necesita una `cashSessionId` (si hay un
medio en efectivo) o `bankAccountId` (si hay un medio bancario) ya
existentes. F6 **no construye** pantallas de apertura/cierre de caja ni
de alta de cuentas bancarias (eso es F7) — si no hay ninguna sesión de
caja abierta o ninguna cuenta bancaria activa, el formulario lo indica
claramente y bloquea el envío del medio correspondiente, con un mensaje
que oriente a resolverlo (abrir caja / dar de alta una cuenta) sin
enlazar a una pantalla de gestión que todavía no existe.

### 3.5 Cheques diferidos — se muestran, no se gestionan

Confirmado en el relevamiento: `CheckDetail.dueDate`/`status` son
puramente informativos — no hay ningún caso de uso para depositar,
cobrar o rechazar un cheque, y `status` queda fijo en `EN_CARTERA` desde
que se crea el pago. F6 permite **registrar** un cobro/pago con Cheque
(pide número, banco, fecha de vencimiento — RN-PAY-07) y lo **muestra**
en el detalle del pago con sus datos, pero no ofrece ninguna acción de
"depositar"/"marcar cobrado"/"rechazar" — esa funcionalidad no existe en
el backend. Se documenta como fuera de alcance y recomendación para un
sprint futuro (no necesariamente F7, que es Caja y Bancos operativo, no
gestión de cheques).

### 3.6 Formulario único para Cobro y Pago

Mismo criterio que `VoucherForm` en F5: un componente (`PaymentForm`)
con una prop `direction: 'COLLECTION' | 'PAYMENT'` que decide contraparte
(cliente vs. proveedor) y el signo/dirección de los movimientos
generados (100% resuelto por el backend, el frontend solo elige
`direction`). Dos páginas finas (`/tesoreria/nuevo/cobro`,
`/tesoreria/nuevo/pago`).

### 3.7 Extensión de `CurrentAccountPanel` (F2), no una pantalla separada

En vez de duplicar el panel de cuenta corriente ya construido en F2,
F6 lo extiende con una sección nueva "Comprobantes pendientes" (usando
el cálculo de §3.2) directamente en la misma pantalla de detalle de
Cliente/Proveedor — coherente con cómo F2 ya decidió mostrar la cuenta
corriente embebida en el detalle en vez de un módulo aparte.

## 4. Rutas y componentes

```
app/(authenticated)/[companyId]/tesoreria/
  layout.tsx                — tabs: Vista general | Cobros y pagos
  page.tsx                  — Vista general (saldos, accesos rápidos)
  cobros-pagos/page.tsx     — Listado + filtros
  cobros-pagos/[paymentId]/page.tsx  — Detalle
  nuevo/cobro/page.tsx      — <PaymentForm direction="COLLECTION" />
  nuevo/pago/page.tsx       — <PaymentForm direction="PAYMENT" />

components/tesoreria/
  payments-table.tsx           — listado con filtros
  payment-method-lines.tsx     — filas dinámicas de medios de pago (useFieldArray)
  pending-vouchers-picker.tsx  — selector de comprobantes pendientes con imputación
  payment-form.tsx             — formulario de alta (cobro/pago)
  payment-summary.tsx          — resumen antes de confirmar (deuda/imputado/saldo/medios)
  pending-vouchers-panel.tsx   — sección nueva en el detalle de Cliente/Proveedor

lib/api/treasury/
  payment-methods.ts   — catálogo global
  payments.ts          — Payment, useCreatePayment (con idempotencyKey), useVouchersWithLabels-like
  pending-vouchers.ts  — cálculo cliente de pendiente/vencido (§3.2)
  cash-bank.ts         — useAllCashRegisters/useOpenCashSession (solo lectura, F6), useAllBankAccounts
```

## 5. Casos de uso por pantalla

### 5.1 Vista general (`/tesoreria`)

Accesos rápidos ("Nuevo cobro"/"Nuevo pago"), resumen de saldos totales
a cobrar/a pagar (suma de `CustomerAccount.currentBalance` positivos /
`SupplierAccount.currentBalance` negativos — requiere listar cuentas de
todos los clientes/proveedores activos, componiendo `GET customers` +
`GET .../current-account` por cada uno, igual patrón que F4's Vista
general).

### 5.2 Listado de cobros/pagos (`/tesoreria/cobros-pagos`)

Filtros: contraparte, sentido (cobro/pago), rango de fechas. Botones
"+ Nuevo cobro"/"+ Nuevo pago" (ocultos sin rol de gestión).

### 5.3 Detalle (`/tesoreria/cobros-pagos/[paymentId]`)

Contraparte (enlaza a Cliente/Proveedor), fecha, medios de pago (con
detalle de cheque/tarjeta si corresponde), comprobantes imputados
(enlaza a Comprobantes, F5), total. Sin acciones de edición/anulación
(§3.3).

### 5.4 Alta de cobro/pago (`/tesoreria/nuevo/cobro`, `/nuevo/pago`)

Flujo guiado (1 elegir contraparte → 2 elegir comprobantes pendientes →
3 importe y medios → 4 revisar → 5 confirmar), con
`PaymentSummary` mostrando en todo momento: deuda total, importe
seleccionado (suma de imputaciones marcadas), importe imputado, saldo
restante, medios de pago cargados y su destino (caja/banco), antes de
habilitar "Confirmar".

## 6. Estado

TanStack Query para todo lo backend-originado. `idempotencyKey` se
genera con `useRef(() => crypto.randomUUID())` (una vez por montaje del
formulario, no en cada submit) para sobrevivir a reintentos del mismo
intento sin cambiar entre ellos.

## 7. Fuera de alcance de F6 (diferido explícitamente)

- Gestión de Caja y Bancos (abrir/cerrar sesión, movimientos manuales,
  alta de cuentas) — F7.
- Reversión/anulación de un `Payment` — no existe en el backend (§3.3).
- Ciclo de vida de cheques diferidos (depositar/cobrar/rechazar) — no
  existe en el backend (§3.5).
- Conciliación bancaria — `BankMovement.isReconciled` siempre `false`,
  sin UI para cambiarlo (no hay caso de uso de backend).
- Idempotencia genérica para toda la API — se resolvió acotada a
  `Payment`; `vouchers` (F5) sigue con mitigación solo de frontend hasta
  que se decida extenderla.
