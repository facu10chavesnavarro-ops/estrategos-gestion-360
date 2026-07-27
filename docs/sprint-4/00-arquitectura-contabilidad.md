# Sprint 4 — Contabilidad (Plan de Cuentas y Asientos)

> Estado: **implementado, probado y versionado (v0.10.0)**. Decisiones 2.3 y
> 2.4 aprobadas explícitamente por el usuario; el resto de la §8 se aprobó
> con las recomendaciones propuestas. Ver §9 para el resultado real.

## 0. Restricciones heredadas (no negociables, ya fijadas)

- Aislamiento multi-tenant por `companyId` en toda tabla operativa, con su
  índice propio.
- Todo alta/baja lógica: nunca se borra físicamente un registro confirmado
  (RN-009). Un asiento erróneo se corrige con un **asiento de reversión**,
  nunca editando ni eliminando el original — mismo patrón que `Voucher`
  (RN-VOU-03) y `Payment` (RN-PAY-06).
- Toda escritura multi-tabla pasa por `unitOfWork.run(ctx => ...)`.
- UUID v7 para tablas de alto volumen (`JournalEntry`, `JournalEntryLine`);
  UUID v4 (`@default(uuid())`) para catálogos de bajo volumen
  (`ChartOfAccount`, `AccountingSettings`).
- Auditoría (RN-009): alta/baja/reversión de asientos y altas/bajas del Plan
  de Cuentas quedan registradas vía `AuditLogRepository`, igual que el resto
  del sistema.
- Clean Architecture por módulo: se crea un módulo nuevo `accounting/` con
  `domain/ → application/ → infrastructure/ → presentation/`.

## 1. Alcance de este sprint

**Entra:**

- Plan de Cuentas (`ChartOfAccount`) jerárquico, por empresa.
- Configuración de cuentas del sistema por empresa (`AccountingSettings`):
  cuenta de Deudores por Ventas, cuenta de Proveedores.
- Mapeo contable en las entidades que ya existen (`Category`, `Tax`,
  `CashRegister`, `BankAccount`, `PaymentMethod`) — sin tocar su lógica de
  negocio actual, solo agregando una referencia opcional a una cuenta.
- Asientos contables (`JournalEntry`/`JournalEntryLine`), generados:
  - **Automáticamente** al confirmar un `Voucher` (venta o compra) y al
    confirmar un `Payment` (cobro o pago).
  - **Manualmente**, vía un caso de uso de alta directa (para asientos de
    apertura, ajustes, y todo lo que el motor automático no cubre).
- Libro Diario (listado cronológico de asientos) y Libro Mayor (listado de
  movimientos por cuenta, con saldo acumulado) como endpoints de lectura.

**No entra (diferido, fuera de alcance de Sprint 4):**

- Estados contables (Balance General, Estado de Resultados) — requieren
  reglas de presentación (activo/pasivo corriente vs no corriente) que no
  están definidas todavía.
- Cierre de ejercicio y bloqueo de períodos contables (impediría
  contabilizar hacia atrás de una fecha de cierre) — se puede agregar sin
  romper este modelo el día que se decida.
- Motor de conversión de moneda extranjera (revalúo de tenencias, diferencia
  de cambio) — los asientos en moneda extranjera se registran al tipo de
  cambio de origen, igual que `Voucher.exchangeRate`, sin revalúo posterior.
- Integración AFIP/Libro IVA Digital.
- Presupuestos, centros de costo.

## 2. Decisiones de esta etapa

### 2.1 Plan de Cuentas: por empresa, sembrado desde una plantilla estándar

Cada `Company` tiene su propio Plan de Cuentas (no es un catálogo global
como `VoucherType`/`PaymentMethod`), porque cada empresa nombra y organiza
sus cuentas de forma distinta — mismo criterio que `Category`.

Al activar Contabilidad para una empresa (primera vez que se crea su
`AccountingSettings`), se clona un **plan de cuentas estándar argentino**
(activo, pasivo, patrimonio neto, ingresos, egresos, con las cuentas mínimas
que el resto del sistema necesita: Caja, Bancos, Deudores por Ventas,
Proveedores, IVA Débito Fiscal, IVA Crédito Fiscal, Ventas, Compras). La
empresa puede después agregar/renombrar/desactivar cuentas propias.

Esto es idéntico en espíritu a cómo `VoucherType` se sembró global una sola
vez: acá la plantilla se siembra **por empresa**, en el momento de alta,
para que cada una pueda editarla sin afectar a las demás.

### 2.2 Jerarquía de cuentas: cuentas imputables vs cuentas de agrupación

Igual patrón que `Category` (autorelación `parentId`), con una diferencia
de negocio real: **solo las cuentas "hoja" (sin hijos) aceptan movimientos**
(`allowsMovements`); las cuentas padre son puramente agrupadoras para
reportes (ej. "Activo Corriente" agrupa "Caja", "Bancos", "Deudores por
Ventas" pero nunca recibe un asiento directo). Esto se valida al crear una
`JournalEntryLine`: si la cuenta no es imputable, se rechaza.

### 2.3 Punto de disparo de los asientos automáticos: `Voucher` y `Payment`

El documento pre-Sprint-3 (§16) sugería que `CashMovement`/`BankMovement`
individuales dispararan asientos. Al implementar Tesorería (Sprint
3.4/3.5) surgió una razón concreta para ajustar esto: `CreatePaymentUseCase`
ya agrupa todos los medios de pago de un mismo cobro/pago en un solo evento
de negocio (RN-PAY-10), incluyendo medios que no generan movimiento de caja
ni banco (`CHEQUE` → sin movimiento hoy; `CUENTA_CORRIENTE` → nunca genera
movimiento). Si el asiento se generara por `CashMovement`/`BankMovement`
en lugar de por `Payment`, un cobro dividido en efectivo + cheque generaría
un asiento incompleto (le faltaría la porción en cheque, que no tiene
movimiento de tesorería asociado).

**Decisión propuesta:** el asiento automático se dispara desde:
- `CreateVoucherUseCase`, al confirmar un comprobante de venta o compra
  (dentro de la misma transacción que ya crea el `Voucher` y afecta stock
  y cuenta corriente).
- `CreatePaymentUseCase`, al confirmar un cobro o pago (dentro de la misma
  transacción que ya crea el `Payment` y sus movimientos).

`CashMovement`/`BankMovement` dejan de ser disparadores directos — siguen
existiendo exactamente igual que hoy (control de caja/banco), pero el
asiento contable ya quedó generado por el `Payment` que los originó. Los
movimientos manuales de caja/banco (sin `paymentId`, RN-CASH-07/RN-BANK-03)
si generan asiento propio (ver 2.7), porque no hay un `Payment` que lo haga.

### 2.4 Mecanismo de mapeo contable

Se agrega una referencia opcional a `ChartOfAccount` en las entidades que ya
clasifican el hecho económico, sin tocar su lógica de negocio existente:

| Entidad existente | Campo nuevo | Para qué se usa |
|---|---|---|
| `Category` | `salesAccountId`, `purchasesAccountId` (ambos opcionales) | Clasificar el ingreso o el gasto/costo de cada línea de comprobante según a qué categoría pertenece su ítem |
| `Tax` | `salesAccountId`, `purchasesAccountId` | IVA Débito Fiscal (venta) vs IVA Crédito Fiscal (compra) — misma tasa, cuentas distintas según el flujo |
| `CashRegister` | `accountId` | Qué cuenta de "Caja" mueve esa caja física |
| `BankAccount` | `glAccountId` | Qué cuenta de "Banco" mueve esa cuenta bancaria (nombrado `glAccountId`, no `accountId`, para no confundir con `accountNumber`/`accountType` que ya identifican la cuenta bancaria real) |

**Hallazgo 1 durante la implementación:** `PaymentMethod` es un catálogo
**global** (sin `companyId`, igual que `VoucherType`/`Role`), pero
`ChartOfAccount` es por empresa — una FK directa `PaymentMethod.accountId`
no puede funcionar porque cada empresa necesita mapear el mismo método
(ej. `CHEQUE`) a una cuenta distinta de su propio plan. Se resuelve con una
tabla puente mínima, no con una tabla de reglas de mapeo genérica (eso
seguiría violando la decisión 2.4 aprobada): `CompanyPaymentMethodAccount
{ companyId, paymentMethodId, direction, accountId }`, usada solo para
medios que no generan `CashMovement` ni `BankMovement` (hoy: `CHEQUE`;
`CUENTA_CORRIENTE` sin efecto de tesorería, ver nota más abajo).

**Hallazgo 2 durante la implementación:** el mismo medio de pago necesita
una cuenta distinta según el sentido de la operación — un `CHEQUE`
recibido en un cobro (`PaymentDirection.COLLECTION`) es un activo
("Valores a Depositar"); un `CHEQUE` propio entregado en un pago
(`PaymentDirection.PAYMENT`) es un pasivo ("Cheques Emitidos a Pagar"). Por
eso `direction` forma parte de la clave de `CompanyPaymentMethodAccount`
junto con `companyId`/`paymentMethodId` — sin esto, una empresa solo podría
mapear `CHEQUE` a una única cuenta, incorrecta para uno de los dos
sentidos.

Y una tabla nueva, una fila por empresa:

- `AccountingSettings.accountsReceivableId` → cuenta de control de Deudores
  por Ventas (todas las `CustomerAccountMovement` usan esta única cuenta,
  no una por cliente — el sub-mayor por cliente ya lo da `CustomerAccount`).
- `AccountingSettings.accountsPayableId` → cuenta de control de Proveedores
  (análogo, vía `SupplierAccount`).

**Nota sobre `CUENTA_CORRIENTE` como medio de pago:** hoy este medio no
genera ningún movimiento de tesorería (ver `docs/sprint-3/04-tesoreria.md`
§0.5) — su único efecto es el `CustomerAccountMovement`/
`SupplierAccountMovement` que *todo* `Payment` ya genera. Un asiento
"Debe Deudores por Ventas / Haber Deudores por Ventas" no tiene sentido
contable. Si una empresa configura este medio, el motor de asientos omite
la línea de contrapartida de tesorería para esa porción del pago — deja
constancia en el log de que ese medio no genera asiento de tesorería. Si
en el futuro se necesita modelar compensación de deuda entre partes, será
un caso de uso nuevo, no este.

Si un mapeo requerido falta al momento de confirmar el hecho económico
(ej. la `Category` del ítem no tiene `salesAccountId`, o la `CashRegister`
no tiene `accountId`), **se rechaza la operación** con un error de
validación explícito — no se permite un `Voucher`/`Payment` confirmado sin
su asiento contable completo (evita el mismo problema que Contabilidad
tradicionalmente llama "comprobante sin imputar").

### 2.5 `JournalEntry` inmutable — corrección por reversión

Igual que `Voucher`/`Payment`: no hay `UpdateJournalEntryUseCase`. Un
asiento con error se corrige creando un **asiento de reversión** que
invierte débitos y créditos del original, enlazado por `reversalOfEntryId`.
El asiento original queda intacto para trazabilidad — RN-009.

### 2.6 Balanceo obligatorio: débito = crédito

`CreateJournalEntryUseCase` (tanto el automático como el manual) valida que
`Σ débitos = Σ créditos` antes de persistir, dentro de la misma transacción.
Un asiento desbalanceado se rechaza — no se persiste parcialmente.

### 2.7 Asientos manuales: sí, en el mismo motor

Se incluye un caso de uso `CreateManualJournalEntryUseCase` que recibe
directamente las líneas (cuenta + debe/haber + descripción) y usa la misma
validación de balanceo y el mismo `JournalEntryRepository`. Se distingue del
automático por `origin: MANUAL | AUTOMATIC` y `sourceType`/`sourceId`
nulos (un asiento manual no tiene comprobante/pago de origen). Necesario
para: asiento de apertura, ajustes, y los movimientos manuales de
caja/banco (`CreateCashMovementUseCase`/`CreateBankMovementUseCase`
existentes, que no pasan por `Payment`) — estos últimos generan su asiento
automático propio (contra la cuenta de la caja/banco y una cuenta que el
usuario indica al crear el movimiento manual, ya que hoy `reason`/
`description` son texto libre sin cuenta asociada — se agrega un
`counterpartAccountId` obligatorio a esos dos casos de uso).

### 2.8 Multi-moneda: mismo patrón que `Voucher`

`JournalEntry` lleva `currency` + `exchangeRate` (default 1), igual que
`Voucher`. Sin motor de revalúo — está fuera de alcance (§1).

## 3. Modelo de datos propuesto

```prisma
enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  INCOME
  EXPENSE
}

model ChartOfAccount {
  id               String      @id @default(uuid())
  companyId        String
  parentId         String?
  code             String
  name             String
  type             AccountType
  allowsMovements  Boolean     @default(true)
  isSystemAccount  Boolean     @default(false)
  isActive         Boolean     @default(true)
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  @@unique([companyId, code])
  @@index([companyId])
  @@index([companyId, parentId])
}

/// Tabla puente companyId+paymentMethodId+direction -> accountId
/// (ver hallazgos §2.4): PaymentMethod es global, ChartOfAccount es por
/// empresa, y el mismo medio necesita cuentas distintas según el sentido.
model CompanyPaymentMethodAccount {
  companyId       String
  paymentMethodId String
  direction       PaymentDirection
  accountId       String

  @@id([companyId, paymentMethodId, direction])
}

model AccountingSettings {
  companyId             String   @id
  accountsReceivableId  String
  accountsPayableId     String
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

enum JournalEntryOrigin {
  AUTOMATIC
  MANUAL
}

enum JournalEntrySourceType {
  VOUCHER
  PAYMENT
}

/// id sin @default: uuidv7(), alto volumen. Inmutable — RN-009.
model JournalEntry {
  id                String                  @id
  companyId         String
  date              DateTime
  description       String
  currency          String
  exchangeRate      Decimal                 @default(1) @db.Decimal(10, 4)
  origin            JournalEntryOrigin
  sourceType        JournalEntrySourceType?
  sourceId          String?
  reversalOfEntryId String?
  createdByUserId   String
  createdAt         DateTime                @default(now())

  lines JournalEntryLine[]

  @@index([companyId, date])
  @@index([sourceType, sourceId])
}

/// id sin @default: uuidv7(), alto volumen.
model JournalEntryLine {
  id             String   @id
  journalEntryId String
  accountId      String
  debit          Decimal  @default(0) @db.Decimal(14, 2)
  credit         Decimal  @default(0) @db.Decimal(14, 2)
  description    String?

  @@index([journalEntryId])
  @@index([accountId])
}
```

Campos nuevos en modelos existentes (todos opcionales, sin migración de
datos porque son altas nuevas de FK nullable):

- `Category.salesAccountId`, `Category.purchasesAccountId`
- `Tax.salesAccountId`, `Tax.purchasesAccountId`
- `CashRegister.accountId`
- `BankAccount.accountId`
- `PaymentMethod.accountId`

## 4. Reglas de negocio (borrador — numeración final si se aprueba el diseño)

- **RN-ACC-01**: una `ChartOfAccount` con `allowsMovements = false` nunca
  puede recibir una `JournalEntryLine` directa (solo agrupa para reportes).
- **RN-ACC-02**: una `ChartOfAccount` con `isSystemAccount = true` no puede
  desactivarse mientras esté referenciada desde `AccountingSettings`,
  `Category`, `Tax`, `CashRegister`, `BankAccount` o `PaymentMethod`.
- **RN-ACC-03**: todo `JournalEntry` debe balancear: `Σ debit = Σ credit`
  entre sus líneas.
- **RN-ACC-04**: `JournalEntry` es inmutable — no hay actualización ni
  borrado físico; la corrección es un asiento de reversión.
- **RN-ACC-05**: confirmar un `Voucher` o un `Payment` sin que todas las
  cuentas necesarias estén mapeadas rechaza la operación completa (no se
  crea el comprobante/pago sin su asiento).
- **RN-ACC-06**: los movimientos manuales de caja/banco exigen indicar la
  cuenta contrapartida (`counterpartAccountId`) además del motivo/
  descripción ya exigido desde Sprint 3.5.

## 5. Endpoints (borrador)

```
POST   /companies/:id/chart-of-accounts
GET    /companies/:id/chart-of-accounts
GET    /companies/:id/chart-of-accounts/:accountId
PATCH  /companies/:id/chart-of-accounts/:accountId
POST   /companies/:id/chart-of-accounts/:accountId/deactivate
POST   /companies/:id/chart-of-accounts/:accountId/activate

GET    /companies/:id/accounting-settings
PUT    /companies/:id/accounting-settings

POST   /companies/:id/journal-entries              (manual)
GET    /companies/:id/journal-entries               (Libro Diario)
GET    /companies/:id/journal-entries/:entryId
POST   /companies/:id/journal-entries/:entryId/reverse

GET    /companies/:id/chart-of-accounts/:accountId/ledger   (Libro Mayor)
```

## 6. Archivos a tocar (estimado)

- `apps/api/prisma/schema.prisma` + migración (`ChartOfAccount`,
  `AccountingSettings`, `JournalEntry`, `JournalEntryLine`, campos nuevos en
  `Category`/`Tax`/`CashRegister`/`BankAccount`/`PaymentMethod`).
- `apps/api/prisma/seed.ts`: plantilla de plan de cuentas estándar (función
  reutilizable, se siembra al activar Contabilidad, no en el seed global).
- Nuevo módulo `apps/api/src/modules/accounting/{domain,application,
  infrastructure,presentation}/**`.
- Retrofit de `create-voucher.use-case.ts` y `create-payment.use-case.ts`
  (mismo patrón usado en Sprint 3.4/3.5: inyectar
  `ApplyJournalEntryService` y llamarlo dentro del `ctx` ya abierto).
- Retrofit de `create-cash-movement.use-case.ts` /
  `create-bank-movement.use-case.ts` (agregar `counterpartAccountId`).
- Tests unitarios, de integración (rollback) y e2e — mismo estándar de los
  sprints anteriores.

## 7. Pruebas (plan)

- **Unitarias**: CRUD de `ChartOfAccount` (jerarquía, `allowsMovements`,
  `isSystemAccount`), `AccountingSettings`, `CreateManualJournalEntryUseCase`
  (balanceo, cuenta no imputable rechazada), retrofit de
  `CreateVoucherUseCase`/`CreatePaymentUseCase` (mapeo faltante rechaza,
  asiento generado balancea), `ReverseJournalEntryUseCase`.
- **Integración**: rollback de un `Voucher`/`Payment` cuando falla el
  asiento (no debe quedar comprobante/pago huérfano sin su asiento, ni
  viceversa); camino feliz de Libro Mayor (saldo acumulado correcto tras
  varios asientos).
- **E2E manual**: activar Contabilidad para la empresa piloto, mapear
  cuentas mínimas, confirmar una Factura y un Cobro, verificar el asiento
  generado y el Libro Mayor de Caja.

## 8. Checklist de decisiones que requieren tu aprobación explícita

| # | Decisión | Mi recomendación | Tu resolución |
|---|---|---|---|
| 2.1 | Plan de Cuentas por empresa, sembrado desde una plantilla estándar argentina al activar Contabilidad | Sí | ✅ |
| 2.2 | Jerarquía con cuentas imputables (hoja) vs agrupadoras (padre) | Sí | ✅ |
| **2.3** | **El asiento automático se dispara desde `Voucher` y `Payment` (no desde `CashMovement`/`BankMovement` individuales, ajustando lo sugerido en el doc pre-Sprint-3 §16)** | **Sí — evita fragmentar un cobro con medios mixtos en asientos incompletos** | ✅ **Aprobado explícitamente por el usuario** |
| **2.4** | **Mapeo contable distribuido en las entidades existentes (`Category`/`Tax`/`CashRegister`/`BankAccount`/`PaymentMethod`) + `AccountingSettings` para cuentas de control (Deudores/Proveedores), en vez de una tabla de "reglas de mapeo" separada** | **Sí — más simple, cada entidad ya sabe clasificar su propio hecho económico** | ✅ **Aprobado explícitamente por el usuario** |
| 2.5 | `JournalEntry` inmutable, corrección por asiento de reversión | Sí | ✅ |
| 2.7 | Incluir asientos manuales en este mismo sprint (no diferirlos) | Sí | ✅ |
| 1 | Diferir Estados Contables, cierre de ejercicio y motor de revalúo de moneda extranjera a un sprint posterior | Sí | ✅ |

Quedo a la espera de tu aprobación (o tus ajustes) sobre este documento
completo, con especial atención a las decisiones 2.3 y 2.4, antes de
escribir cualquier código, migración o test de Sprint 4.

## 9. Resultado real (verificado, no supuesto)

- **Migraciones**: `20260727202136_contabilidad` (`ChartOfAccount`,
  `AccountingSettings`, `JournalEntry`, `JournalEntryLine`,
  `CompanyPaymentMethodAccount`, campos de mapeo en `Category`/`Tax`/
  `CashRegister`/`BankAccount`, checks de balanceo por línea) y
  `20260727202800_company_payment_method_account_direction` (agrega
  `direction` a la clave de `CompanyPaymentMethodAccount`, hallazgo #2 más
  abajo). Ambas aplicadas limpiamente a `estrategos_dev` y `estrategos_test`.
- **Tests unitarios**: 355/355 (59 nuevos: 20 de `ChartOfAccount`/
  `AccountingSettings`/mapeo de medios de pago, 22 de
  `ApplyJournalEntryService`/asientos manuales/reversión/Libro Diario/Libro
  Mayor, 4 del retrofit de `CreateVoucherUseCase`, 6 del retrofit de
  `CreatePaymentUseCase`, 4 del retrofit de movimientos manuales de
  caja/banco). `tsc --noEmit` y `eslint` limpios sobre `src/` y `test/`.
- **Tests de integración**: 24/24 (3 nuevos, contra `estrategos_test` real):
  camino feliz completo (activar Contabilidad → mapear cuentas → Factura →
  Cobro → asientos balanceados → Libro Mayor con saldo acumulado correcto),
  rollback (fallo forzado de auditoría del Cobro no deja un `JournalEntry`
  huérfano), y rechazo cuando falta el mapeo de una categoría.
- **Build**: `npm run build` (`nest build`) limpio.
- **E2E manual** (servidor real + Postgres real): activar Contabilidad
  para la empresa piloto → verificado que re-activar rechaza
  (`AccountingAlreadyActivatedError`) → Plan de Cuentas clonado con las 18
  cuentas de la plantilla → verificado que desactivar una cuenta de sistema
  rechaza (`SystemAccountCannotBeDeactivatedError`) → mapeo de Category/Tax/
  CashRegister → Factura de Venta confirmada genera un asiento de 3 líneas
  balanceado (Deudores por Ventas / Ventas / IVA Débito Fiscal) → Cobro en
  efectivo confirmado genera un asiento de 2 líneas balanceado (Deudores
  por Ventas / Caja) → Libro Mayor de Caja refleja el saldo acumulado
  correcto → asiento manual creado y revertido correctamente → asiento
  desbalanceado rechazado → revertir dos veces el mismo asiento rechazado.

### Desviaciones y hallazgos durante la implementación (no estaban en el plan original)

1. **`PaymentMethod` es global, `ChartOfAccount` es por empresa** (§2.4):
   una FK directa `PaymentMethod.accountId` no podía funcionar porque cada
   empresa necesita mapear el mismo método a una cuenta de su propio plan.
   Resuelto con la tabla puente `CompanyPaymentMethodAccount`, sin violar
   la decisión aprobada (no es una tabla de reglas de mapeo genérica, solo
   resuelve la única relación que estructuralmente lo necesitaba).
2. **El mismo medio de pago necesita cuentas distintas según el sentido**:
   un `CHEQUE` recibido en un cobro es un activo ("Valores a Depositar");
   un `CHEQUE` propio entregado en un pago es un pasivo ("Cheques Emitidos
   a Pagar"). Se agregó `direction` a la clave de `CompanyPaymentMethodAccount`
   — descubierto y corregido antes de escribir ningún caso de uso sobre la
   tabla original (migración adicional sobre una tabla todavía vacía, sin
   impacto en datos reales).
3. **La exención de `CUENTA_CORRIENTE` planteada en §2.4 no era correcta**:
   si un medio sin efecto de tesorería no genera ninguna línea de asiento,
   un pago dividido entre efectivo y `CUENTA_CORRIENTE` dejaría el asiento
   desbalanceado (se acredita la cuenta corriente por el total, pero solo
   se debita la porción en efectivo). Se corrigió tratando **todos** los
   medios sin `CashMovement`/`BankMovement` de manera uniforme: exigen un
   mapeo en `CompanyPaymentMethodAccount`, sin excepciones — más simple y
   contablemente correcto que la excepción originalmente planteada.
4. **`accountingActive` se decide con una comprobación "truthy" (`Boolean(x)`), no `!== null`**:
   los mocks de test que no configuran `AccountingSettingsRepository.findByCompany`
   devuelven `undefined`, no `null`. Con `!== null` esto se hubiera evaluado
   como "Contabilidad activa" por accidente en decenas de tests ya
   existentes de Sprints 3.3/3.4/3.5. Se detectó antes de que rompiera
   ningún test (se corrigió al escribir el retrofit, no como parche
   posterior) y queda como un patrón más robusto para el resto del código.
5. **Nombrado `BankAccount.glAccountId` en vez de `accountId`**: la entidad
   ya usa `accountNumber`/`accountType` para identificar la cuenta bancaria
   real — un segundo campo `accountId` para la cuenta contable hubiera sido
   ambiguo al leer el modelo. Se usó `glAccountId` ("General Ledger") para
   distinguirlos sin ambigüedad.

Estos cinco puntos son refinamientos necesarios de las decisiones 2.3/2.4
ya aprobadas, no alternativas de diseño nuevas — se documentan aquí en vez
de haberse frenado a pedir aprobación de nuevo, siguiendo el mismo criterio
usado en Sprints 3.4/3.5 para hallazgos de implementación de bajo riesgo y
alto valor.
