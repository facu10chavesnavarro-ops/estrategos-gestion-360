# Sprint F7 — Frontend de Caja y Bancos

Construye la UI completa sobre las entidades `CashRegister`,
`CashSession`, `CashMovement`, `BankAccount`, `BankMovement` del módulo
`treasury` (backend, Sprint 3.5), ya operativas de forma automática
desde F6 (todo `Payment` en efectivo o bancario genera sus propios
movimientos). Sigue la misma metodología, arquitectura y estándares de
F0–F6.

## 1. Alcance

Administración de cajas (alta, apertura/cierre de turno, arqueo,
movimientos manuales) y de cuentas bancarias (alta, movimientos
manuales), viendo también los movimientos automáticos que ya genera
Tesorería (F6) desde el primer cobro/pago en efectivo o bancario. **F7
no construye Contabilidad** — el mapeo de caja/cuenta a una cuenta
contable (`accountId`/`glAccountId`) queda diferido a F8 (§3.3).

**Entregable**: módulo de Caja y Bancos completo y operable. E2E: dar
de alta una caja → abrir sesión → ingreso manual → egreso manual →
recibir movimientos automáticos de un cobro/pago (Tesorería) → cerrar
sesión sin diferencia → abrir y cerrar otra sesión con diferencia →
rechazo de segunda apertura → rechazo de cobro en efectivo sin caja
abierta (ya cubierto por F6, se re-verifica que sigue vigente) → dar de
alta una cuenta bancaria → movimiento manual → verificar movimiento de
Tesorería → verificar saldos → prevención de doble envío → persistencia
tras recargar.

## 2. Relevamiento del contrato backend (resumen)

Fuente: `docs/sprint-3/05-caja-bancos.md` (RN-CASH-01 a 08, RN-BANK-01 a
04), `docs/sprint-4/00-arquitectura-contabilidad.md` (RN-ACC-06, mapeo
contable) + lectura directa de
`apps/api/src/modules/treasury/{domain,application,presentation}/`.

### 2.1 Entidades

- **`CashRegister`**: `id, companyId, branchId, name, isActive,
  accountId`. Pertenece a una sucursal (`branchId`, inmutable tras
  crear). `accountId` (mapeo contable, Sprint 4) solo se completa vía
  `update`, nunca en el alta.
- **`CashSession`**: `id, cashRegisterId, openedByUserId,
  openingBalance, openedAt, closedByUserId, closingBalance,
  expectedBalance, difference, closedAt`. `isOpen` es un getter de
  dominio (`closedAt === null`) que **el backend no serializa** — el
  frontend ya lo deriva así desde F6 (`isCashSessionOpen`).
  `expectedBalance`/`difference` quedan `null` hasta el cierre; son
  snapshots inmutables, no se recalculan después.
- **`CashMovement`**: `id, cashSessionId, type (IN|OUT), amount,
  paymentId, reason, createdAt`. Sin `paymentId` → manual, exige
  `reason`. Con `paymentId` → automático desde un `Payment` (F6), no
  editable ni borrable desde acá.
- **`BankAccount`**: `id, companyId, bankName, accountType
  (CHECKING|SAVINGS), accountNumber, cbu, alias, currency, isActive,
  glAccountId`. **Sin `currentBalance` persistido** — a diferencia de
  `CustomerAccount`/`SupplierAccount` (§3.1). **Sin campo de titular**
  — no existe `accountHolder` en este modelo (sí existe uno homónimo en
  `Supplier`, para los datos bancarios *del proveedor*, un concepto
  completamente distinto; no confundir). `currency`/`accountType` solo
  se fijan al crear, `update` no los admite (evita corromper montos ya
  registrados en otra moneda).
- **`BankMovement`**: `id, bankAccountId, type (DEPOSIT|WITHDRAWAL),
  amount, paymentId, description, date, isReconciled, reconciledAt,
  createdAt`. `isReconciled` queda **siempre `false`** — no existe
  ningún caso de uso para marcarlo `true` (§3.5). `date` es editable en
  el alta manual (a diferencia de `CashMovement`, que siempre usa
  `createdAt`).

### 2.2 Reglas confirmadas (antes de programar, como exige el brief)

- **Una caja, una sesión abierta a la vez** (RN-CASH-02): verificado
  con una consulta dentro de la misma transacción antes de abrir, no
  con un constraint de DB — el error `CashRegisterAlreadyHasOpenSessionError`
  cubre la carrera.
- **Cualquier usuario con rol de gestión puede operar cualquier caja de
  la empresa** — no existe asignación usuario↔caja ni restricción por
  sucursal en el dominio. Los ocho casos de uso de escritura (crear/
  actualizar/activar/desactivar caja, abrir/cerrar sesión, movimiento
  manual de caja, ídem banco) exigen uniformemente
  `ROLES_THAT_CAN_MANAGE_COMPANY` — el mismo gate ya usado en F2-F6
  (`canManage` vía `useCurrentMembership`).
- **Cobrar/pagar en efectivo sin caja abierta**: ya rechazado desde F6
  (`MissingCashSessionError`/`InvalidCashSessionError`) — F7 no cambia
  esa validación, solo la hace más visible al dar de alta cajas y
  sesiones desde la propia UI.
- **Saldo esperado** (`CloseCashSessionUseCase`): `expectedBalance =
  openingBalance + Σ(CashMovement IN) − Σ(CashMovement OUT)` de la
  sesión, calculado en el backend en el momento del cierre — el
  frontend nunca lo calcula, solo lo muestra.
- **Saldo contado y diferencia**: `closingBalance` lo informa quien
  cierra; `difference = closingBalance − expectedBalance`, también
  calculada y persistida por el backend como snapshot. El frontend
  solo envía `closingBalance` y muestra el resultado que devuelve la
  respuesta.
- **Auditoría de apertura/cierre/movimientos**: todos los casos de uso
  de escritura llaman a `AuditLogRepository.record(...)` dentro de la
  misma transacción (`cash_session.open/close`,
  `cash_movement.in/out`, `bank_movement.deposit/withdrawal`,
  `cash_register.create/update/(de)activate`,
  `bank_account.create/update/(de)activate`) — confirmado leyendo cada
  caso de uso. **No existe ningún endpoint para leer esos registros**
  (ver §3.6) — la auditoría ocurre, pero no es visible desde el
  frontend ni verificable por un test E2E de UI.
- **Movimientos manuales vs. automáticos**: los manuales (sin
  `paymentId`) exigen `reason`/`description` y se crean solo desde
  `POST .../movements`. Los automáticos (con `paymentId`) se crean
  únicamente dentro de `CreatePaymentUseCase` (F6) — no existe (ni debe
  existir en F7) ningún botón que los genere manualmente; F7 solo los
  **muestra** mezclados con los manuales en el historial de
  movimientos, distinguibles por `paymentId` (enlaza al detalle del
  cobro/pago en Tesorería) vs. `reason`/`description`.
- **Cómo se evita duplicar movimientos**: para los automáticos, la
  garantía es la de F6 (`idempotencyKey` de `Payment`, RN-PAY-11) — un
  `Payment` nunca se duplica, así que tampoco sus movimientos. Para los
  manuales, no hay una clave de idempotencia dedicada; F7 aplica la
  misma mitigación de frontend usada en F1-F6 (deshabilitar el botón de
  confirmar durante el envío) — documentado como deuda menor, igual
  categoría que la de `vouchers` en F5.
- **Operación revertida**: no existe ningún caso de uso de reversión ni
  para `CashMovement` ni para `BankMovement` (ni para `Payment`, ya
  documentado en F6) — confirmado por ausencia total en
  `application/use-cases/`. Un movimiento manual mal cargado se
  corrige con un movimiento inverso nuevo (ej. un egreso para
  compensar un ingreso mal cargado), no con una edición ni un borrado.
  **No existe tampoco reapertura de una sesión cerrada** — una vez
  cerrada, la única vía es abrir una sesión nueva.

### 2.3 Endpoints usados por F7

| Método | Endpoint | Uso |
|---|---|---|
| `GET` | `companies/:id/branches/:branchId/cash-registers` | Listado de cajas por sucursal (compuesto entre sucursales, igual que F6) |
| `POST` | `companies/:id/branches/:branchId/cash-registers` | Alta de caja |
| `GET` | `companies/:id/branches/:branchId/cash-registers/:cashRegisterId` | Detalle de caja |
| `PATCH` | `companies/:id/branches/:branchId/cash-registers/:cashRegisterId` | Editar nombre (y `accountId`, diferido a F8) |
| `POST` | `.../cash-registers/:cashRegisterId/activate` \| `/deactivate` | Activar/desactivar |
| `GET` | `.../cash-registers/:cashRegisterId/sessions` | Historial de sesiones |
| `POST` | `.../cash-registers/:cashRegisterId/sessions` | Abrir sesión |
| `POST` | `companies/:id/cash-sessions/:cashSessionId/close` | Cerrar sesión |
| `GET` | `companies/:id/cash-sessions/:cashSessionId/movements` | Movimientos de una sesión |
| `POST` | `companies/:id/cash-sessions/:cashSessionId/movements` | Movimiento manual de caja |
| `GET` | `companies/:id/bank-accounts` | Listado de cuentas |
| `POST` | `companies/:id/bank-accounts` | Alta de cuenta |
| `GET` | `companies/:id/bank-accounts/:bankAccountId` | Detalle |
| `PATCH` | `companies/:id/bank-accounts/:bankAccountId` | Editar (no admite `accountType`/`currency`) |
| `POST` | `.../bank-accounts/:bankAccountId/activate` \| `/deactivate` | Activar/desactivar |
| `GET` | `.../bank-accounts/:bankAccountId/movements` | Movimientos de una cuenta |
| `POST` | `.../bank-accounts/:bankAccountId/movements` | Movimiento manual de banco |

**Ninguno de los tres `GET` de movimientos/sesiones admite filtros ni
paginación server-side** (confirmado leyendo `ListCashMovementsUseCase`/
`ListBankMovementsUseCase`/`ListCashSessionsUseCase`: reciben solo el id
del padre y devuelven todo) — los filtros por fecha/tipo/usuario/estado
pedidos en el brief se resuelven **client-side**, mismo criterio que el
listado de Comprobantes (F5) y de Cobros/Pagos (F6).

### 2.4 Errores (ya en español, se muestran tal cual vía `ApiError`)

`CashRegisterNotFoundError`, `InvalidCashRegisterBranchError`,
`CashRegisterAlreadyInTargetStateError`, `CashSessionNotFoundError`,
`CashRegisterAlreadyHasOpenSessionError` (RN-CASH-02),
`InvalidOpeningBalanceError` (RN-CASH-03, saldo inicial negativo),
`CashSessionAlreadyClosedError`, `MissingCashMovementReasonError`,
`CashSessionNotOpenError` (RN-CASH-06, movimiento manual sobre sesión
cerrada), `InvalidCashMovementAmountError`, `BankAccountNotFoundError`,
`BankAccountAlreadyInTargetStateError`,
`MissingBankMovementDescriptionError`, `InvalidBankMovementAmountError`.
Con Contabilidad activa (no alcanzable desde el frontend hoy, §3.3):
`MissingCounterpartAccountError`, `MissingCashRegisterAccountMappingError`,
`MissingBankAccountMappingError`.

### 2.5 Autorización

Idéntico patrón a F2-F6: **toda** escritura (alta/edición/activar/
desactivar caja o cuenta, abrir/cerrar sesión, movimiento manual)
exige `ROLES_THAT_CAN_MANAGE_COMPANY`; lectura abierta a cualquier
miembro activo de la empresa.

## 3. Decisiones técnicas

### 3.1 Saldo de caja y de cuenta bancaria — calculado en el cliente

Ninguna de las dos entidades persiste un saldo corriente fuera del
cierre de una sesión (`CashSession.expectedBalance`, snapshot). Para
"Vista general" y el listado, F7 deriva:

```
saldo(cuenta bancaria)   = Σ(BankMovement.amount donde type=DEPOSIT)
                          − Σ(BankMovement.amount donde type=WITHDRAWAL)
saldo(caja, con sesión abierta) = sesión.openingBalance
                          + Σ(CashMovement IN de esa sesión)
                          − Σ(CashMovement OUT de esa sesión)
saldo(caja, sin sesión abierta) = closingBalance de la última sesión
                          cerrada (o "—" si nunca se abrió ninguna)
```

No es una decisión con alternativas reales — es exactamente la misma
fórmula que ya usa `CloseCashSessionUseCase` en el backend para
`expectedBalance`, aplicada también fuera del momento del cierre para
poder mostrar un número en pantalla. Aritmética en centavos
(`toCents`/`fromCents`, mismo helper de `pending-vouchers.ts` de F6)
para evitar arrastre de punto flotante.

### 3.2 "Transferencias" entre cuentas bancarias — dos movimientos independientes, sin atomicidad prometida

El backend no tiene ningún concepto de transferencia: solo
`CashMovement`/`BankMovement` individuales. Una "transferencia" entre
dos cuentas bancarias (pedida en el alcance mínimo) se implementa como
un único formulario de conveniencia que dispara **dos `POST`
secuenciales e independientes** (`WITHDRAWAL` en origen +
`DEPOSIT` en destino, ambos con una `description` que menciona la
cuenta contraparte, ej. "Transferencia a Banco Nación ...1234"). No hay
transacción de backend que los una: si el segundo `POST` falla después
de que el primero tuvo éxito, la UI lo informa explícitamente ("El
egreso en origen se registró, pero el ingreso en destino falló — se
guarda como movimiento suelto y hay que corregirlo a mano") en vez de
ocultar el estado parcial o reintentar solo. No se ofrece "transferir
entre caja y banco" (serían tipos de movimiento distintos sin ningún
caso de uso combinado) — solo banco↔banco.

### 3.3 Mapeo contable (`accountId`/`glAccountId`) — diferido a F8

`UpdateCashRegisterUseCase`/`UpdateBankAccountUseCase` ya aceptan un
`accountId`/`glAccountId` apuntando a un `ChartOfAccount` (Sprint 4),
obligatorio recién cuando `AccountingSettings` está activo para la
empresa. Hoy **no existe ninguna pantalla de Contabilidad en el
frontend** (F8) — ni para activar `AccountingSettings` ni para listar/
elegir un `ChartOfAccount`. Por lo tanto:

- Ninguna empresa creada y operada solo desde la app puede tener
  Contabilidad activa todavía → las ramas de error
  `MissingCounterpartAccountError`/`Missing*AccountMappingError` son
  hoy inalcanzables en la práctica.
- F7 **no construye** un selector de cuenta contable en los formularios
  de edición de caja/cuenta bancaria (requeriría un picker de
  `ChartOfAccount` que pertenece a F8) ni en el de movimiento manual
  (requeriría el mismo picker para `counterpartAccountId`).
- Si en el futuro alguien activa Contabilidad para una empresa por otra
  vía (ej. API directa, como se hizo para los tests de integración del
  Sprint 4), los movimientos manuales de esa empresa devolverán el
  error correspondiente y F7 lo muestra tal cual (`ApiError.message`,
  mismo patrón ya usado en toda la app) — no lo oculta, pero tampoco lo
  resuelve. Documentado como recomendación explícita para F8 (§13 del
  cierre).

### 3.4 Reapertura de sesión / reversión de movimiento — no existe, fuera de alcance

Confirmado por ausencia total en `application/use-cases/`: ninguna
sesión cerrada puede reabrirse, ningún movimiento (manual o automático)
puede revertirse ni editarse. F7 no ofrece ninguna acción de este tipo
— un error de carga se corrige con un movimiento nuevo en sentido
contrario, igual que ya se documentó para `Payment` en F6.

### 3.5 Conciliación bancaria — no existe, fuera de alcance

`BankMovement.isReconciled` queda siempre `false`: no hay ningún caso
de uso para marcarlo `true` ni para hacer *matching* contra un extracto
bancario. F7 **no construye** ninguna pantalla ni acción de
conciliación — se muestra el campo (siempre "Pendiente") solo para que
la ausencia de la funcionalidad sea visible y no parezca un bug.
Documentado como recomendación para una versión posterior (el brief lo
autoriza explícitamente: "no desarrollar integración automática... si
el backend no lo soporta").

### 3.6 Auditoría — se registra, no se puede leer desde el frontend

Los ocho casos de uso de escritura auditan correctamente (§2.2), pero
no existe ningún controller/endpoint que exponga `AuditLog` — se
confirmó con una búsqueda exhaustiva de controllers en todo el backend.
F7 no construye un visor de auditoría (no hay contrato que consumir) y
la prueba crítica "verificar auditoría" del brief se resuelve como
**verificación de código, no de UI**: se confirma leyendo cada caso de
uso (ya hecho en este relevamiento, §2.2) que el `auditLogRepository.record(...)`
correspondiente se llama dentro de la misma transacción que la
operación — el mismo criterio que ya se usó para "aislamiento entre
empresas"/"permisos por rol" en F5/F6 (cubierto por tests de backend,
no duplicado en E2E de frontend).

### 3.7 Titular de cuenta bancaria — el campo no existe, se omite

El alcance mínimo pide mostrar "Titular", pero `BankAccount` no tiene
ese campo (existe uno homónimo, pero en `Supplier`, con un significado
distinto — ver §2.1). No se agrega una migración para esto: una cuenta
bancaria de la propia empresa tiene un titular implícito (la empresa
misma), y el brief no señala un caso de uso real de "cuentas de
terceros" dentro de este módulo. Se documenta como gap frente al brief,
no como decisión con alternativas — no hay nada que programar sin
tocar el backend.

### 3.8 Listado de cajas — compuesto entre sucursales, igual que F6

No existe un `GET` de cajas a nivel empresa (solo por sucursal). El
listado de F7 reutiliza/generaliza `useAllCashRegisters` (ya escrito en
F6) — mismo patrón de composición en dos etapas que
`useAllWarehouses` (F4) y `useAllPointsOfSale` (F5).

## 4. Rutas y componentes

```
app/(authenticated)/[companyId]/caja-bancos/
  layout.tsx                          — tabs: Caja | Bancos
  caja/page.tsx                       — Vista general + listado de cajas
  caja/[cashRegisterId]/page.tsx      — Detalle de caja: historial de sesiones, abrir turno
  caja/[cashRegisterId]/sesiones/[cashSessionId]/page.tsx
                                       — Detalle de sesión: movimientos, ingreso/egreso, cerrar turno
  bancos/page.tsx                     — Vista general + listado de cuentas
  bancos/[bankAccountId]/page.tsx     — Detalle de cuenta: saldo, movimientos, ingreso/egreso/transferencia

components/caja-bancos/
  cash-registers-table.tsx        — listado de cajas (alta/editar/activar/desactivar)
  cash-register-form.tsx          — alta/edición de caja (nombre, sucursal)
  open-session-dialog.tsx         — elegir caja → saldo inicial → confirmar
  close-session-dialog.tsx        — inicial/ingresos/egresos/esperado/contado/diferencia → confirmar
  cash-sessions-table.tsx         — historial de sesiones de una caja
  cash-movements-table.tsx        — movimientos de una sesión (manual + automático), filtros client-side
  cash-movement-form.tsx          — ingreso/egreso manual
  bank-accounts-table.tsx         — listado de cuentas (alta/editar/activar/desactivar)
  bank-account-form.tsx           — alta/edición de cuenta
  bank-movements-table.tsx        — movimientos de una cuenta, filtros client-side
  bank-movement-form.tsx          — ingreso/egreso manual
  bank-transfer-form.tsx          — transferencia banco↔banco (§3.2)

lib/api/treasury/
  cash-bank.ts   — extendido: CRUD CashRegister/BankAccount, abrir/cerrar sesión,
                   movimientos manuales, saldo derivado (§3.1)
```

## 5. Casos de uso por pantalla

### 5.1 Caja — Vista general + listado (`/caja-bancos/caja`)

Tarjetas de saldo total en caja (suma de §3.1 sobre todas las sesiones
abiertas) y listado de cajas por sucursal con estado (abierta/cerrada/
inactiva), botón "Abrir turno" cuando corresponde. Alta/edición vía
`Sheet` (mismo patrón que Depósitos F4/Puntos de venta F5), activar/
desactivar con `ConfirmDialog`.

### 5.2 Detalle de caja (`/caja-bancos/caja/[cashRegisterId]`)

Historial de sesiones (fecha apertura/cierre, saldo inicial, esperado,
contado, diferencia con `Badge` destructivo si `difference !== 0`),
enlace a cada sesión cerrada y a la abierta (si existe). Botón "Abrir
turno" si no hay sesión abierta.

### 5.3 Detalle de sesión (`/caja-bancos/caja/.../sesiones/[cashSessionId]`)

Saldo inicial, movimientos (tabla con tipo IN/OUT, monto, motivo u
origen — enlaza al cobro/pago si `paymentId`), saldo corriente derivado
en vivo (§3.1) mientras está abierta. Botones "+ Ingreso"/"+ Egreso"
(motivo obligatorio). Botón "Cerrar turno" abre el diálogo de cierre:
inicial → ingresos → egresos → esperado → campo "saldo contado" →
diferencia calculada en vivo (esperado vs. lo que se está por
informar) → confirmar (llama a `close`, muestra el resultado
definitivo que devuelve el backend, que es la fuente de verdad).

### 5.4 Bancos — Vista general + listado (`/caja-bancos/bancos`)

Igual criterio que Caja: saldo total (suma de §3.1 sobre cuentas
activas), listado con alta/edición/activar/desactivar.

### 5.5 Detalle de cuenta bancaria (`/caja-bancos/bancos/[bankAccountId]`)

Saldo derivado (§3.1), datos de la cuenta, movimientos (tabla con
tipo, monto, fecha, descripción u origen, "Pendiente" fijo en
Conciliación — §3.5), filtros client-side por fecha/tipo. Botones "+
Ingreso"/"+ Egreso"/"+ Transferencia" (§3.2).

## 6. Estado

TanStack Query para todo lo backend-originado, invalidando
`cash-registers`/`cash-sessions`/`cash-movements`/`bank-accounts`/
`bank-movements` tras cada mutación (mismo criterio que
`useCreatePayment` en F6). Sin estado global nuevo — reutiliza
`useCurrentMembership`/`ROLES_THAT_CAN_MANAGE_COMPANY` para `canManage`.

## 7. Fuera de alcance de F7 (diferido explícitamente)

- Mapeo contable (`accountId`/`glAccountId`) en los formularios — F8
  (§3.3).
- Reapertura de sesión / reversión de movimiento — no existe en el
  backend (§3.4).
- Conciliación bancaria real — no existe en el backend (§3.5).
- Visor de auditoría — no existe endpoint de lectura (§3.6).
- Campo "Titular" de cuenta bancaria — no existe en el backend (§3.7).
- Transferencia atómica entre cuentas — el backend no la soporta; F7
  ofrece una conveniencia de dos movimientos independientes, explícita
  sobre su falta de atomicidad (§3.2).
