# Sprint F8 — Frontend de Contabilidad

Construye la UI completa sobre las entidades `ChartOfAccount`,
`AccountingSettings`, `JournalEntry`, `JournalEntryLine`,
`CompanyPaymentMethodAccount` del módulo `accounting` (backend, Sprint
4), integrándola con Comprobantes (F5), Tesorería (F6) y Caja y Bancos
(F7), cuyos casos de uso ya generan asientos automáticos desde ese
sprint. Sigue la misma metodología, arquitectura y estándares de F0–F7.
**F8 es el último módulo de negocio principal del frontend** — no
implica que el proyecto esté listo para producción (ver §8).

## 1. Alcance

Activación opcional de Contabilidad por empresa, gestión del Plan de
Cuentas, consulta de asientos (automáticos y manuales), alta manual de
asientos balanceados, reversión, Libro Diario y Libro Mayor, y el
retrofit de F3 (Categorías/Impuestos) y F7 (Cajas/Cuentas bancarias)
para exponer los mapeos contables que sus backends ya soportan pero que
quedaron deliberadamente diferidos hasta ahora.

**Entregable**: módulo de Contabilidad completo y operable. E2E:
activar Contabilidad → verificar Plan de Cuentas clonado (18 cuentas)
→ crear cuenta → crear subcuenta → validar jerarquía → rechazar
configuración inválida → crear asiento manual balanceado → rechazar
asiento desbalanceado → consultar Libro Diario → consultar Libro Mayor
de una cuenta → verificar asiento automático de una venta/compra/cobro/
pago ya generados en sprints previos → revertir un asiento manual →
verificar que un asiento ya revertido no se puede revertir de nuevo →
persistencia tras recargar.

## 2. Relevamiento del contrato backend (resumen)

Fuente: lectura directa de
`apps/api/src/modules/accounting/{domain,application,presentation}/`,
`apps/api/prisma/schema.prisma` (sección Sprint 4) y los puntos de
integración ya existentes en
`apps/modules/{vouchers,treasury}/application/use-cases/{create-voucher,create-payment}.use-case.ts`.

### 2.1 Entidades

- **`ChartOfAccount`**: `id, companyId, parentId, code, name, type
  (ASSET|LIABILITY|EQUITY|INCOME|EXPENSE), allowsMovements,
  isSystemAccount, isActive`. Jerarquía autorreferencial vía `parentId`
  (igual patrón que `Category` en F3). `allowsMovements=true` = cuenta
  imputable (hoja, puede recibir líneas de asiento);
  `allowsMovements=false` = agrupadora (solo de presentación).
  `isSystemAccount=true` protege de la desactivación (RN-ACC-02, las 9
  cuentas de la plantilla marcadas como tales). **El backend no valida
  consistencia de `type` entre padre e hijo** — se puede crear una
  cuenta `EXPENSE` bajo un padre `ASSET`; F8 no bloquea esto (no hay
  regla de dominio que lo prohíba), pero la UI advierte visualmente
  (badge de tipo distinto al del padre) para prevenir errores de carga,
  sin impedir guardar.
- **`AccountingSettings`**: `companyId` (PK, una fila por empresa),
  `accountsReceivableId`, `accountsPayableId`. Solo dos "cuentas de
  control", genéricas para **todos** los clientes/proveedores de la
  empresa — no existe mapeo por cliente o proveedor individual en
  ningún lado del modelo (confirmado por ausencia total de un campo así
  en `Party`/`Customer`/`Supplier` y en este propio DTO). Esto acota el
  punto "Clientes/Proveedores" del mapeo contable pedido en el brief: la
  única cuenta configurable es la de control compartida, no una por
  tercero (ver §3.7).
- **`CompanyPaymentMethodAccount`**: PK compuesta
  `(companyId, paymentMethodId, direction)`, campo `accountId`.
  `direction: COLLECTION|PAYMENT` — el mismo medio de pago necesita una
  cuenta distinta según sea cobro o pago (ej. Cheque recibido → activo
  "Valores a Depositar"; cheque emitido → pasivo "Cheques Emitidos a
  Pagar"). Solo aplica a medios que **no** generan `CashMovement`/
  `BankMovement` automáticamente — hoy, únicamente `CHEQUE` (Efectivo y
  Transferencia ya resuelven su cuenta vía `CashRegister.accountId`/
  `BankAccount.glAccountId`, no por esta tabla).
- **`JournalEntry`**: inmutable, `id` (uuidv7 — tabla de alto volumen),
  `companyId, date, description, currency, exchangeRate, origin
  (AUTOMATIC|MANUAL), sourceType (VOUCHER|PAYMENT|null), sourceId
  (string|null), reversalOfEntryId (string|null),
  createdByUserId, createdAt`, más `lines: JournalEntryLine[]`
  embebidas. `sourceType`/`sourceId` nulos = asiento manual o de un
  movimiento manual de caja/banco (F7) — no hay forma de navegar desde
  ese asiento hacia el movimiento que lo originó (el modelo no guarda
  esa referencia, solo `VOUCHER`/`PAYMENT` la tienen). **Dato crítico**:
  el efecto de caja/banco de un `Payment` se funde en el **mismo**
  asiento que el `Payment` (`sourceType=PAYMENT`) — no existe un
  `JournalEntry` separado por cada `CashMovement`/`BankMovement`
  generado desde un cobro/pago.
- **`JournalEntryLine`**: `id, journalEntryId, accountId, debit,
  credit, description`. Sin campo de saldo — el saldo acumulado se
  calcula únicamente en el Libro Mayor (§2.2).

### 2.2 Reglas confirmadas (antes de programar, como exige el brief)

- **Motor único de asientos** (`ApplyJournalEntryService`): automáticos
  (Voucher, Payment) y manuales pasan por el mismo servicio, que valida
  ≥2 líneas (`EmptyJournalEntryLinesError`), que cada cuenta exista/esté
  activa/sea imputable (`InvalidJournalEntryAccountError`), y que
  Σdébitos = Σcréditos (`UnbalancedJournalEntryError`) — **el backend
  es la única fuente de verdad del balanceo**, el frontend solo lo
  anticipa visualmente (§3.1).
- **Contabilidad es opcional por empresa** (idéntico patrón a Vouchers/
  Payments): `accountingActive = Boolean(accountingSettings)`. Sin
  activar, Comprobantes/Tesorería/Caja y Bancos funcionan exactamente
  igual que hasta F7 — ningún asiento se genera, ningún mapeo se exige.
- **Activación clona una plantilla fija de 18 cuentas** (no 15 — se
  recontó sobre el archivo real: 1 Activo, 1.1 Activo Corriente, 1.1.01
  Caja, 1.1.02 Bancos, 1.1.03 Deudores por Ventas, 1.1.04 Valores a
  Depositar, 1.1.05 IVA Crédito Fiscal, 2 Pasivo, 2.1 Pasivo Corriente,
  2.1.01 Proveedores, 2.1.02 IVA Débito Fiscal, 2.1.03 Cheques Emitidos
  a Pagar, 3 Patrimonio Neto, 3.1 Capital, 3.2 Resultados Acumulados, 4
  Ingresos, 4.1 Ventas, 5 Egresos, 5.1 Compras) y crea
  `AccountingSettings` con `accountsReceivableId`/`accountsPayableId`
  ya resueltos a "Deudores por Ventas"/"Proveedores" — todo en una
  transacción (`ActivateAccountingUseCase`). Rechaza reactivar
  (`AccountingAlreadyActivatedError`).
- **Cuentas del Plan de Cuentas**: solo `parentId` y `name` son
  editables después de crear una cuenta — `code`/`type`/
  `allowsMovements` son inmutables (mismo criterio que
  `Warehouse.branchId`/`CashRegister.branchId`/`BankAccount.accountType
  +currency` en sprints previos). Ciclos de jerarquía se detectan
  recorriendo la cadena de padres (`AccountCycleError`,
  `MAX_DEPTH=100`). Código duplicado dentro de la empresa se rechaza
  (`DuplicateAccountCodeError`).
- **Listado de cuentas**: `GET chart-of-accounts` solo filtra por
  `isActive` server-side, devuelve una lista plana — **no hay
  endpoint que devuelva el árbol armado**. El frontend arma la
  jerarquía en el cliente a partir de la lista plana + `parentId`,
  exactamente el mismo patrón ya usado para `Category` en F3
  (`category-tree.tsx`).
- **Asiento manual**: cualquier usuario con rol de gestión
  (`ROLES_THAT_CAN_MANAGE_COMPANY`) puede crearlo. Campos: `date`
  (opcional, default ahora), `description` (obligatoria), `currency`
  (opcional), `lines[]` (`accountId, debit, credit, description?`,
  mínimo 2). El balanceo definitivo lo valida el backend — el frontend
  solo lo anticipa (§3.1).
- **Reversión** (`ReverseJournalEntryUseCase`): revierte **cualquier**
  asiento, automático o manual, creando un asiento nuevo
  (`origin=MANUAL`, `reversalOfEntryId` apuntando al original,
  descripción `"Reversión de: {descripción original}"`) que invierte
  débito↔crédito de cada línea. Rechaza revertir dos veces el mismo
  asiento (`JournalEntryAlreadyReversedError`, verificado con
  `existsReversalOf`). **Hallazgo crítico de UX**: revertir un asiento
  `AUTOMATIC` (ligado a un Voucher/Payment) **no deshace** la operación
  de negocio que lo originó — el Voucher/Payment/CashMovement/
  BankMovement sigue existiendo intacto; es una corrección puramente
  contable. Esto se debe comunicar explícitamente antes de confirmar
  (§3.2).
- **Libro Diario** (`ListJournalEntriesUseCase`): filtra únicamente por
  `from`/`to` server-side — sin filtro por cuenta/origen/tipo/estado.
  El resto de los filtros pedidos en el brief se resuelven
  **client-side**, mismo criterio ya establecido en F5/F6/F7 para
  listados sin filtros server-side.
- **Libro Mayor** (`GetAccountLedgerUseCase`): **totalmente calculado
  en el servidor, sin filtro de fecha** — devuelve todos los
  movimientos de una cuenta más un `runningBalance` por movimiento, ya
  calculado con la convención contable correcta (`growsWithDebit =
  type === ASSET || type === EXPENSE`). El frontend **no** necesita
  replicar ninguna aritmética de saldo — solo renderiza
  `movements[].runningBalance` tal cual llega. Esto contrasta con F7,
  donde el saldo sí se derivaba en el cliente (F7 §3.1).
- **Mapeo de medio de pago** (`SetPaymentMethodAccountMappingUseCase`):
  valida que la cuenta exista, esté activa y sea imputable
  (`InvalidAccountMappingError`), y que el medio de pago exista
  (`InvalidPaymentMethodError`, reutilizado del módulo `treasury`).
  `upsert` — se puede volver a mapear sin restricción.
- **Auditoría**: todos los casos de uso de escritura registran en
  `AuditLogRepository` dentro de la misma transacción
  (`accounting.activate`, `accounting_settings.update`,
  `chart_of_account.create/update/activate/deactivate`,
  `journal_entry.create/reverse`,
  `payment_method_account_mapping.set`) — confirmado leyendo cada caso
  de uso. **No existe ningún endpoint para leer `AuditLog`** (mismo
  hallazgo que F6/F7) — se documenta como verificación de código, no de
  UI (§3.6).
- **Sin filtro por origen en el backend**: ni `GET journal-entries` ni
  ningún otro endpoint aceptan `sourceType`/`sourceId` como filtro, y no
  existe un flag `isReversed` precalculado en `JournalEntry`. "Navegar
  desde un Comprobante/Pago hacia su asiento" y "saber si un asiento ya
  fue revertido" se resuelven en el cliente (§3.3).

### 2.3 Endpoints usados por F8

| Método | Endpoint | Uso |
|---|---|---|
| `POST` | `companies/:id/accounting-settings/activate` | Activar Contabilidad (clona plantilla) |
| `GET` | `companies/:id/accounting-settings` | Configuración contable (404 = no activada) |
| `PUT` | `companies/:id/accounting-settings` | Editar cuentas de control (AR/AP) |
| `GET` | `companies/:id/accounting-settings/payment-method-account-mappings` | Listar mapeos medio de pago→cuenta |
| `POST` | `companies/:id/accounting-settings/payment-method-account-mappings` | Mapear medio de pago + sentido → cuenta |
| `GET` | `companies/:id/chart-of-accounts?isActive=` | Listado plano del Plan de Cuentas |
| `POST` | `companies/:id/chart-of-accounts` | Crear cuenta (opcionalmente con `parentId`) |
| `GET` | `companies/:id/chart-of-accounts/:accountId` | Detalle de cuenta |
| `GET` | `companies/:id/chart-of-accounts/:accountId/ledger` | Libro Mayor de la cuenta |
| `PATCH` | `companies/:id/chart-of-accounts/:accountId` | Editar (solo `name`/`parentId`) |
| `POST` | `.../chart-of-accounts/:accountId/activate` \| `/deactivate` | Activar/desactivar |
| `GET` | `companies/:id/journal-entries?from=&to=` | Libro Diario |
| `POST` | `companies/:id/journal-entries` | Crear asiento manual |
| `GET` | `companies/:id/journal-entries/:journalEntryId` | Detalle de asiento con líneas |
| `POST` | `.../journal-entries/:journalEntryId/reverse` | Revertir asiento |

### 2.4 Errores (ya en español, se muestran tal cual vía `ApiError`)

`ChartOfAccountNotFoundError`, `InvalidParentAccountError`,
`AccountCycleError`, `DuplicateAccountCodeError`,
`ChartOfAccountAlreadyInTargetStateError`,
`SystemAccountCannotBeDeactivatedError`, `InvalidAccountMappingError`,
`AccountingSettingsNotFoundError`, `AccountingAlreadyActivatedError`,
`UnbalancedJournalEntryError`, `EmptyJournalEntryLinesError`,
`JournalEntryNotFoundError`, `JournalEntryAlreadyReversedError`,
`InvalidJournalEntryAccountError`, `MissingCategoryAccountMappingError`,
`MissingTaxAccountMappingError`, `MissingCashRegisterAccountMappingError`,
`MissingBankAccountMappingError`, `MissingPaymentMethodAccountMappingError`,
`MissingCounterpartAccountError`, `InvalidPaymentMethodError`
(reutilizado de `treasury`). `AccountNotImputableError` está definido
en el dominio pero **no se usa en ningún caso de uso** (código muerto,
confirmado por búsqueda exhaustiva) — no se documenta como
comportamiento esperado del frontend.

### 2.5 Autorización

Idéntico patrón a F2-F7: **toda** escritura (activar Contabilidad,
editar configuración, mapear medio de pago, crear/editar/activar/
desactivar cuenta, crear/revertir asiento) exige
`ROLES_THAT_CAN_MANAGE_COMPANY`; lectura abierta a cualquier miembro
activo de la empresa. No existe un rol específico de "contador" — se
documenta como recomendación para una etapa posterior (§8).

## 3. Decisiones técnicas

### 3.1 Validación de balanceo en el alta manual — anticipada en el cliente, definitiva en el backend

El flujo de 9 pasos pedido en el brief (fecha → concepto → líneas →
cuenta → débito/crédito → diferencia en vivo → bloqueo mientras
Σdébitos≠Σcréditos → confirmar → mostrar asiento) se implementa
restando en el cliente `Σdebit - Σcredit` con aritmética en centavos
(mismo helper `toCents`/`fromCents` de F6/F7) para habilitar/deshabilitar
el botón "Confirmar" en tiempo real. No es una decisión con
alternativas reales — es una restitución directa e inequívoca de la
regla que el backend ya aplica (`UnbalancedJournalEntryError`), igual
categoría que el cálculo de saldo de caja en F7 (§3.1 de ese sprint):
el frontend nunca confía en su propio cálculo para decidir si el
asiento se guardó bien, solo lo usa para no dejar tocar un botón que el
backend rechazaría igual.

### 3.2 Reversión de asiento automático — advertencia explícita, sin intento de deshacer la operación de origen

Dado el hallazgo de §2.2 (revertir un asiento `AUTOMATIC` no toca el
Voucher/Payment que lo generó), el diálogo de confirmación de reversión
muestra un mensaje distinto según `origin`:

- **`MANUAL`**: "Se creará un asiento nuevo que invierte débitos y
  créditos de este. ¿Confirmar?"
- **`AUTOMATIC`**: el mismo mensaje **más** una advertencia explícita:
  "Este asiento fue generado automáticamente por
  [Comprobante/Cobro/Pago]. Revertirlo corrige solo la contabilidad —
  no anula ni modifica el comprobante/cobro/pago original. Si el error
  está en la operación de negocio, corregila desde
  Comprobantes/Tesorería."

No se ofrece ninguna acción de "revertir y anular el origen" — no
existe en el backend y crearla excede el alcance de F8 (afectaría
Vouchers/Payments, no solo Contabilidad).

### 3.3 "¿Ya fue revertido?" y "¿qué operación originó este asiento?" — resueltos con lookup client-side sobre la lista de asientos

El backend no expone ni un flag `isReversed` en `JournalEntry` ni un
filtro `sourceType`/`sourceId` en `GET journal-entries`. F8 resuelve
ambas necesidades reutilizando la misma llamada — `GET
journal-entries` sin `from`/`to` (trae todos los asientos de la
empresa) — y derivando en el cliente:

```
yaRevertido(asiento)   = algún asiento de la lista tiene
                          reversalOfEntryId === asiento.id
asientoDe(voucherId)   = algún asiento de la lista tiene
                          sourceType === 'VOUCHER' && sourceId === voucherId
```

Es la misma clase de decisión que F7 §3.1 (restituir una fórmula ya
implícita en el backend, no inventar una regla nueva) — pero acá se
documenta explícitamente el costo: `JournalEntry` es una tabla de alto
volumen (elegida uuidv7 justamente por eso) y este enfoque escala mal
a medida que crece el historial de una empresa. Se acepta para F8
porque **no hay alternativa sin tocar el backend** (no existe filtro
que reemplace este lookup) y el volumen esperado en el horizonte de
este proyecto (SME, no un ERP de gran escala) lo hace aceptable por
ahora. Se documenta como recomendación concreta para una etapa
posterior (§8): agregar `sourceType`/`sourceId` como filtros de `GET
journal-entries` y/o un campo `reversedByEntryId` calculado en
`JournalEntry`.

### 3.4 Plan de Cuentas — árbol armado en el cliente, mismo patrón que Categorías (F3)

`GET chart-of-accounts` devuelve una lista plana filtrable solo por
`isActive`. F8 arma la jerarquía reutilizando el mismo patrón de
`category-tree.tsx` (F3): agrupar por `parentId`, recorrer
recursivamente para mostrar indentación por profundidad, y excluir del
selector de "cuenta padre" a la propia cuenta y todos sus descendientes
(evita ofrecer un ciclo que el backend rechazaría con
`AccountCycleError`, igual criterio que `collectExcludedIds` en
`category-sheet.tsx`).

### 3.5 Inconsistencia de tipo entre cuenta padre e hija — advertencia visual, no bloqueo

El backend no valida que una cuenta hija tenga el mismo `type` que su
padre (§2.1). No es un bug a corregir en el frontend (el backend nunca
prometió esa validación) ni una regla de negocio que F8 deba inventar
— se resuelve mostrando el `type` de cada cuenta como badge visible en
el árbol y, en el formulario de alta/edición, un aviso no bloqueante
("Esta cuenta es de tipo X, pero su padre es de tipo Y") cuando
difieren. Documentado como recomendación de validación de dominio para
una etapa posterior (§8), no implementada en el backend por decisión
fuera del alcance de F8.

### 3.6 Auditoría — se registra, no se puede leer desde el frontend

Mismo hallazgo que F6/F7 (§2.2): los ocho casos de uso de escritura
auditan correctamente, pero no existe ningún controller que exponga
`AuditLog`. La prueba crítica "verificar auditoría" del brief se
resuelve como verificación de código (ya hecha en este relevamiento),
no de UI.

### 3.7 Mapeo por Cliente/Proveedor — no existe, solo dos cuentas de control genéricas

El brief pide confirmar el mapeo entre "Clientes/Proveedores" y cuentas
contables. Confirmado por relevamiento exhaustivo (`AccountingSettings`,
`Party`/`Customer`/`Supplier`, y ausencia de cualquier tabla puente
equivalente a `CompanyPaymentMethodAccount` para clientes o
proveedores): el modelo es deliberadamente simplificado a nivel SME —
**todas** las cuentas por cobrar de **todos** los clientes se imputan a
la única cuenta `accountsReceivableId`, e ídem `accountsPayableId` para
proveedores. No hay sub-cuenta por tercero. F8 no construye ningún
selector de cuenta en las pantallas de Cliente/Proveedor (F2) porque no
hay nada que mapear ahí — la única configuración real de este punto es
la pantalla de Configuración contable (§5.1), donde se eligen esas dos
cuentas de control. Documentado como aclaración del alcance, no como
gap a resolver.

### 3.8 Retrofit de Categorías/Impuestos (F3) — solo falta UI, el contrato ya está listo

`lib/api/catalog/{categories,taxes}.ts` **ya** exponen
`salesAccountId`/`purchasesAccountId` en los tipos `Category`/`Tax` y
en `UpdateCategoryInput`/`UpdateTaxInput` (confirmado leyendo el
archivo — no es una suposición). El backend (`Category`/`Tax` del
módulo `catalog`) ya acepta esos campos vía sus endpoints `PATCH`
existentes. El único trabajo de F8 es agregar dos `Select` de
`ChartOfAccount` (filtrados a `allowsMovements=true && isActive`) en
`category-sheet.tsx`/`tax-sheet.tsx`, deshabilitados con una nota
("activá Contabilidad para mapear cuentas") cuando
`accountingActive === false`.

### 3.9 Retrofit de Caja y Bancos (F7) — requiere extender también `lib/api`

A diferencia de §3.8, `CashRegisterInput`/`BankAccountUpdateInput` en
`lib/api/treasury/cash-bank.ts` **no** incluyen `accountId`/
`glAccountId` todavía (el tipo de lectura `CashRegister`/`BankAccount`
sí los expone, pero no los tipos de escritura) — confirmado leyendo el
archivo. F8 extiende esos dos tipos y agrega el `Select` de
`ChartOfAccount` correspondiente en `cash-register-sheet.tsx`/
`bank-account-sheet.tsx`, mismo criterio de F3 (filtrado a cuentas
imputables activas, deshabilitado si Contabilidad no está activa). El
backend (`UpdateCashRegisterUseCase`/`UpdateBankAccountUseCase`, F7 ya
lo confirmó en su propio relevamiento) ya acepta estos campos — no hay
cambios de backend en F8 para este punto.

### 3.10 Movimiento manual de caja/banco con Contabilidad activa — selector de contrapartida

`MissingCounterpartAccountError` (RN-ACC-06) exige que, con
Contabilidad activa, un movimiento manual de caja/banco (F7) incluya
`counterpartAccountId`. F8 agrega ese selector (mismo `Select` de
`ChartOfAccount` imputable/activa) a `cash-movement-form.tsx`/
`bank-movement-form.tsx` — visible solo si `accountingActive === true`,
oculto si no (igual que hasta F7, donde este campo nunca se enviaba).

## 4. Rutas y componentes

```
app/(authenticated)/[companyId]/contabilidad/
  layout.tsx                              — tabs: Plan de Cuentas | Asientos | Libro Mayor | Configuración
  page.tsx                                — redirect a Plan de Cuentas (o CTA de activación si no está activa)
  configuracion/page.tsx                  — activar Contabilidad, editar cuentas de control, mapeo de medios de pago
  plan-de-cuentas/page.tsx                — árbol del Plan de Cuentas, alta/edición/activar/desactivar
  plan-de-cuentas/[accountId]/page.tsx    — detalle de cuenta + su Libro Mayor
  asientos/page.tsx                       — Libro Diario: listado cronológico de asientos, filtrable
  asientos/[journalEntryId]/page.tsx      — detalle de asiento, reversión
  asientos/nuevo/page.tsx                 — alta de asiento manual
  libro-mayor/page.tsx                    — Libro Mayor como destino propio: elegir cuenta → ver movimientos

components/contabilidad/
  accounting-activation-card.tsx      — CTA de activación + estado (activa/inactiva)
  accounting-settings-form.tsx        — editar accountsReceivableId/accountsPayableId
  payment-method-mappings-table.tsx   — mapeo medio de pago + sentido → cuenta (hoy solo Cheque)
  chart-of-accounts-tree.tsx          — árbol del Plan de Cuentas (§3.4)
  chart-of-account-sheet.tsx          — alta/edición de cuenta
  account-ledger-table.tsx            — Libro Mayor de una cuenta (runningBalance del backend)
  journal-entries-table.tsx           — Libro Diario, filtros client-side
  journal-entry-detail.tsx            — líneas, origen (enlace a Comprobante/Pago), estado de reversión
  journal-entry-form.tsx              — alta manual (flujo de 9 pasos, §3.1)
  reverse-entry-dialog.tsx            — confirmación de reversión con advertencia (§3.2)
  account-select.tsx                  — selector reutilizable de ChartOfAccount (imputable/activa), usado
                                         en el retrofit de F3/F7 (§3.8/§3.9/§3.10) y en journal-entry-form

lib/api/accounting/
  settings.ts            — activar/obtener/editar AccountingSettings, mapeo de medios de pago
  chart-of-accounts.ts   — CRUD ChartOfAccount + Libro Mayor
  journal-entries.ts     — crear/listar/obtener/revertir JournalEntry
```

## 5. Casos de uso por pantalla

### 5.1 Configuración contable (`/contabilidad/configuracion`)

Si `AccountingSettingsNotFoundError` (404): tarjeta de activación
explicando qué se clona (18 cuentas) y qué se activa en Comprobantes/
Tesorería/Caja y Bancos a partir de ese momento, botón "Activar
Contabilidad" con `ConfirmDialog` (acción no reversible desde la UI —
no existe un caso de uso de desactivación). Si ya está activa: formulario
para editar `accountsReceivableId`/`accountsPayableId` (§3.7) y tabla
de mapeo de medios de pago (§2.1, hoy solo Cheque tiene sentido
mapear — el resto ya se resuelve vía `CashRegister.accountId`/
`BankAccount.glAccountId`, F7 retrofit §3.9).

### 5.2 Plan de Cuentas (`/contabilidad/plan-de-cuentas`)

Árbol con código/nombre/tipo/badge imputable-o-agrupadora, búsqueda por
código o nombre (client-side, filtra el árbol completo), toggle
activas/inactivas. Alta/edición vía `Sheet` (mismo patrón que
Categorías F3): código/tipo fijos tras crear, nombre/padre editables.
Activar/desactivar con `ConfirmDialog` — desactivar una cuenta de
sistema (`isSystemAccount`) muestra el error del backend
(`SystemAccountCannotBeDeactivatedError`) tal cual.

### 5.3 Detalle de cuenta (`/contabilidad/plan-de-cuentas/[accountId]`)

Datos de la cuenta (código, nombre, tipo, jerarquía con enlace al
padre), y su Libro Mayor completo (`GetAccountLedgerUseCase`): tabla de
movimientos con fecha, asiento (enlace al detalle), descripción,
débito, crédito, `runningBalance` — todo tal cual lo devuelve el
backend, sin cálculo en el cliente (§2.2).

### 5.4 Libro Diario / Asientos (`/contabilidad/asientos`)

Listado cronológico con filtro de fecha server-side (`from`/`to`) y
filtros adicionales client-side (cuenta, origen AUTOMATIC/MANUAL,
sourceType, revertido/no revertido — derivado según §3.3). Cada fila:
fecha, número/id, descripción, origen con badge, total (Σdebit de sus
líneas), enlace al detalle. Botón "Nuevo asiento manual".

### 5.5 Detalle de asiento (`/contabilidad/asientos/[journalEntryId]`)

Cabecera (fecha, descripción, origen, moneda) y tabla de líneas
(cuenta, débito, crédito, descripción de línea) con totales al pie
(siempre iguales, invariante ya garantizada por el backend). Si
`sourceType`/`sourceId` están presentes: enlace directo al Comprobante
(F5) o Cobro/Pago (F6) de origen. Si `reversalOfEntryId` está
presente: enlace al asiento original con nota "Este asiento revierte
a...". Botón "Revertir" (oculto si `yaRevertido(asiento)`, §3.3) que
abre `reverse-entry-dialog.tsx` (§3.2).

### 5.6 Alta de asiento manual (`/contabilidad/asientos/nuevo`)

Flujo de 9 pasos del brief: fecha (default hoy) → concepto → agregar
líneas (cada una: `account-select.tsx` + monto + débito/crédito
mediante un único campo con signo, o dos columnas separadas) →
diferencia Σdebit−Σcredit visible en todo momento → botón "Confirmar"
deshabilitado mientras la diferencia sea distinta de cero (§3.1) → al
confirmar, muestra el asiento devuelto por el backend (fuente de
verdad) y navega a su detalle.

## 6. Estado

TanStack Query para todo lo backend-originado, invalidando
`accounting-settings`/`chart-of-accounts`/`journal-entries` tras cada
mutación (mismo criterio que el resto de F0-F7). `accountingActive`
se deriva de `useAccountingSettings` (`404` ⇒ `false`, cualquier otra
respuesta ⇒ `true`) y se consulta desde F3 (Categorías/Impuestos) y F7
(Caja y Bancos) para condicionar la visibilidad de los selectores de
cuenta del retrofit (§3.8/§3.9/§3.10). Sin estado global nuevo —
reutiliza `useCurrentMembership`/`ROLES_THAT_CAN_MANAGE_COMPANY` para
`canManage`.

## 7. Fuera de alcance de F8 (diferido explícitamente)

- Mapeo de cuenta contable por cliente/proveedor individual — no existe
  en el backend, solo las dos cuentas de control genéricas (§3.7).
- Reapertura de asientos, cierre de ejercicio/período contable, estados
  contables formales (Balance, Estado de Resultados) — no existen casos
  de uso en el backend; el brief mismo pide no implementarlos todavía.
- Validación de consistencia de tipo entre cuenta padre e hija — el
  backend no la implementa; F8 solo advierte visualmente (§3.5).
- Filtro por origen (`sourceType`/`sourceId`) o flag `isReversed`
  server-side — no existen; F8 los deriva client-side sobre la lista
  completa de asientos (§3.3), documentado como deuda técnica.
- Rol específico de "contador" con permisos distintos a
  `ROLES_THAT_CAN_MANAGE_COMPANY` — no existe en el backend.
- Visor de auditoría — no existe endpoint de lectura (§3.6).
- Conciliación bancaria avanzada, ciclo de vida de cheques,
  idempotencia de `Payment` más allá de lo ya resuelto en F6 — deuda
  técnica heredada de sprints anteriores, no tocada por F8.

## 8. Recomendaciones para la etapa posterior al MVP

F8 cierra el frontend de los módulos de negocio principales
(Clientes/Proveedores, Catálogo, Stock, Comprobantes, Tesorería, Caja y
Bancos, Contabilidad), pero **no** implica que Estrategos Gestión 360
esté listo para producción ni para comercializarse. Antes de esa etapa
se recomienda, en este orden de prioridad:

1. **Auditoría de seguridad**: permisos por rol, aislamiento entre
   empresas, manejo de secretos/tokens, dependencias desactualizadas.
2. **Auditoría técnica**: deuda técnica acumulada (idempotencia de
   `Payment` más allá de lo cubierto en F6, ciclo de vida de cheques,
   ausencia de endpoint de auditoría legible, filtros
   `sourceType`/`sourceId` en `journal-entries` §3.3, validación de
   tipo entre cuenta padre/hija §3.5).
3. **Validación contable**: revisión por un contador matriculado del
   Plan de Cuentas estándar, el mapeo de impuestos/categorías, y el
   comportamiento de reversión (§3.2) frente a normativa argentina real
   (libro IVA, libro diario rubricado, etc. — hoy fuera de alcance).
4. **Auditoría funcional** end-to-end de los ocho módulos juntos, con
   datos de una empresa real (no solo la Empresa E2E sintética).
5. **Pruebas de carga**: en particular sobre `JournalEntry` (tabla de
   alto volumen) y los listados sin paginación server-side (Comprobantes,
   Pagos, movimientos de Caja/Bancos, asientos) — todos funcionan hoy
   por el volumen bajo de una empresa de prueba, no está validado su
   comportamiento con miles de registros.
6. **Pruebas E2E integrales** cruzando los ocho módulos en un solo
   flujo de negocio real (alta de cliente → venta → cobro → cierre de
   caja → asiento → Libro Mayor), no solo por sprint aislado.
7. **UX**: revisión con usuarios administrativos reales (no solo
   contadores) de si la complejidad contable quedó efectivamente oculta,
   como pide el objetivo de F8.
8. **Corrección de deuda técnica** priorizada por la auditoría técnica
   (punto 2), no todo de una vez.
9. **Preparación para producción**: variables de entorno, backups,
   monitoreo, rate limiting, HTTPS/certificados, plan de rollback de
   migraciones.
10. **Piloto con usuarios reales** de una o dos empresas pequeñas antes
    de una comercialización más amplia.
