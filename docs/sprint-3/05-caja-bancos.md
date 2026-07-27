# Sprint 3 — Sub-sprint 5: Caja y Bancos

Implementa §11, §12 y completa §14 de
`docs/sprint-3/00-arquitectura-nucleo-financiero.md` (documento de
arquitectura ya aprobado, incluyendo la Decisión 11.2: caja por sucursal
con sesiones por turno). Quinto y último sub-sprint del plan de §18 —
depende de Sprint 3.4 (`Payment`) para saber qué movimiento generar.
Cierra el núcleo financiero tal como fue planificado. Estado: **en
implementación.**

## 0. Decisiones de esta etapa

Ídem sub-sprints anteriores: implementación de decisiones ya aprobadas,
más refinamientos de bajo riesgo documentados por transparencia (no
requieren nueva aprobación — ver criterio en cada punto).

### 0.1 `Payment` pasa a generar `CashMovement`/`BankMovement` (cierre de Sprint 3.4)

El documento de arquitectura (§14) especifica que un `Payment` genera,
según corresponda, una fila en `CashMovement` (si algún medio es
Efectivo) y en `BankMovement` (si algún medio se liquida en banco) — pero
Sprint 3.4 **difirió explícitamente** esto porque `CashSession`/
`BankAccount` no existían (§0.2 de `docs/sprint-3/04-tesoreria.md`). No es
un cambio de alcance nuevo — es completar lo ya aprobado, en el orden que
el propio §18 planificó.

Concretamente, `CreatePaymentUseCase` se extiende con dos parámetros
**nuevos y opcionales** en el request: `cashSessionId` y `bankAccountId`.
No son columnas de `Payment` (que sigue sin cambios en su tabla) — son
datos de la operación, usados solo para decidir dónde postear el
movimiento; la trazabilidad queda en `CashMovement.paymentId`/
`BankMovement.paymentId`, exactamente el mismo patrón unidireccional que
`StockMovement.voucherId` (Sprint 3.3): el movimiento apunta a su origen,
el origen no necesita apuntar de vuelta.

- Si algún `PaymentMethodDetail` usa un medio con
  `requiresCashMovement = true` (Efectivo), el request **debe** incluir
  `cashSessionId` de una sesión **abierta** de la misma empresa; se genera
  un único `CashMovement` por la suma de los montos de esos medios
  (`type = IN` si `direction = COLLECTION`, `OUT` si `PAYMENT`).
- Si algún medio usa `requiresBankMovement = true` (Transferencia/Tarjeta),
  el request **debe** incluir `bankAccountId` de una cuenta bancaria activa
  de la misma empresa; se genera un único `BankMovement` por la suma de
  esos medios (`type = DEPOSIT` si `COLLECTION`, `WITHDRAWAL` si `PAYMENT`).
- `Cuenta Corriente` no requiere ninguno de los dos (`requiresCashMovement
  = requiresBankMovement = false`, ya sembrado en Sprint 3.4) — sigue sin
  generar movimiento de caja/banco, solo el de cuenta corriente.
- Se agrupa **por requisito, no por medio**: si un pago combinara dos
  medios que ambos requieren caja (caso hoy inexistente en el catálogo,
  pero posible a futuro), se genera un único `CashMovement` con la suma —
  evita movimientos fragmentados sin ningún caso de uso real que lo pida.

### 0.2 Alcance recortado: sin conciliación bancaria ni reportes de arqueo

El documento de arquitectura ya dice explícitamente (§12.2) que
`BankMovement.isReconciled` se agrega desde ahora "aunque la lógica de
conciliación... no se construye en Sprint 3" — se respeta tal cual:
`isReconciled` queda siempre en `false`, no hay endpoint para marcarlo. De
la misma forma, el cierre de una `CashSession` calcula y persiste
`expectedBalance`/`difference` (dato, según §11.2), pero no se construye
ningún reporte de arqueo más allá de devolver esos dos números en la
respuesta del cierre — un reporte imprimible es una mejora de UX
incremental sin cambio de modelo, se agrega cuando haya una pantalla real
que lo necesite.

### 0.3 Movimientos manuales de Caja y Banco (mismo patrón que Stock en Sprint 3.2)

Antes de que `Payment` (Sprint 3.4) existiera, Stock ya soportaba ajustes
manuales (Sprint 3.2) — la misma secuencia se repite acá: además de los
movimientos automáticos que genera un `Payment`, se agregan
`CreateCashMovementUseCase`/`CreateBankMovementUseCase` para movimientos
manuales sin origen en un pago (ej. el dueño deposita efectivo propio en
la caja, un débito bancario de gastos de mantenimiento). RN-CASH-05/
RN-BANK-03 exigen `reason`/`description` precisamente para estos casos
(`paymentId` nulo); un movimiento generado por `Payment` no lo exige (el
origen ya es autoexplicativo vía `paymentId`).

### 0.4 Se extiende el módulo `treasury` existente, no uno nuevo

`CashRegister`/`CashSession`/`CashMovement`/`BankAccount`/`BankMovement`
son, conceptualmente, la misma "Tesorería" que `Payment`/`CurrentAccount`
(Sprint 3.4) — de hecho dependen de `Payment` para saber qué generar. Se
agregan como nuevos sub-recursos dentro de `apps/api/src/modules/
treasury/**` en vez de crear un módulo `cash-and-banks` separado, evitando
una dependencia circular entre dos módulos que en la práctica son la
misma responsabilidad.

## 1. Modelo de datos

### 1.1 `CashRegister` / `CashSession`

```prisma
model CashRegister {
  id        String   @id @default(uuid())
  companyId String   @map("company_id")
  branchId  String   @map("branch_id")
  name      String
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  sessions CashSession[]

  @@index([companyId])
  @@map("cash_registers")
}

/// RN-CASH-02: un CashRegister solo puede tener una sesión abierta a la
/// vez — se verifica con una consulta antes de abrir (mismo criterio ya
/// usado para "una CashSession abierta por caja", análogo a
/// RN-STK-... de unicidad aplicativa, no de constraint de DB).
model CashSession {
  id               String    @id @default(uuid())
  cashRegisterId   String    @map("cash_register_id")
  openedByUserId   String    @map("opened_by_user_id")
  openingBalance   Decimal   @map("opening_balance") @db.Decimal(14, 2)
  openedAt         DateTime  @default(now()) @map("opened_at")
  closedByUserId   String?   @map("closed_by_user_id")
  closingBalance   Decimal?  @map("closing_balance") @db.Decimal(14, 2)
  expectedBalance  Decimal?  @map("expected_balance") @db.Decimal(14, 2)
  difference       Decimal?  @db.Decimal(14, 2)
  closedAt         DateTime? @map("closed_at")

  cashRegister CashRegister    @relation(fields: [cashRegisterId], references: [id])
  movements    CashMovement[]

  @@index([cashRegisterId])
  @@map("cash_sessions")
}
```

### 1.2 `CashMovement` (UUID v7 — alto volumen)

```prisma
enum CashMovementType {
  IN
  OUT
}

model CashMovement {
  id            String           @id
  cashSessionId String           @map("cash_session_id")
  type          CashMovementType
  amount        Decimal          @db.Decimal(14, 2)
  paymentId     String?          @map("payment_id")
  reason        String?
  createdAt     DateTime         @default(now()) @map("created_at")

  cashSession CashSession @relation(fields: [cashSessionId], references: [id])
  payment     Payment?    @relation(fields: [paymentId], references: [id])

  @@index([cashSessionId, createdAt])
  @@map("cash_movements")
}
```

### 1.3 `BankAccount` / `BankMovement` (UUID v7 — alto volumen)

```prisma
enum BankAccountType {
  CHECKING
  SAVINGS
}

enum BankMovementType {
  DEPOSIT
  WITHDRAWAL
}

model BankAccount {
  id            String          @id @default(uuid())
  companyId     String          @map("company_id")
  bankName      String          @map("bank_name")
  accountType   BankAccountType @map("account_type")
  accountNumber String?         @map("account_number")
  cbu           String?
  alias         String?
  currency      String
  isActive      Boolean         @default(true) @map("is_active")
  createdAt     DateTime        @default(now()) @map("created_at")
  updatedAt     DateTime        @updatedAt @map("updated_at")

  movements BankMovement[]

  @@index([companyId])
  @@map("bank_accounts")
}

/// isReconciled queda siempre false en este sub-sprint (§0.2) — sin
/// lógica de conciliación bancaria.
model BankMovement {
  id            String            @id
  bankAccountId String            @map("bank_account_id")
  type          BankMovementType
  amount        Decimal           @db.Decimal(14, 2)
  paymentId     String?           @map("payment_id")
  description   String?
  date          DateTime
  isReconciled  Boolean           @default(false) @map("is_reconciled")
  reconciledAt  DateTime?         @map("reconciled_at")
  createdAt     DateTime          @default(now()) @map("created_at")

  bankAccount BankAccount @relation(fields: [bankAccountId], references: [id])
  payment     Payment?    @relation(fields: [paymentId], references: [id])

  @@index([bankAccountId, date])
  @@map("bank_movements")
}
```

## 2. Reglas de negocio

| ID | Regla |
|---|---|
| RN-CASH-01 | `CashRegister` pertenece a una `Branch` de la misma empresa (mismo criterio que RN-STK-01 sobre `Warehouse`). |
| RN-CASH-02 | Un `CashRegister` solo puede tener una `CashSession` abierta (`closedAt = NULL`) a la vez. |
| RN-CASH-03 | `openingBalance` no puede ser negativo. |
| RN-CASH-04 | Cerrar una `CashSession` exige que esté abierta; calcula `expectedBalance = openingBalance + Σ(IN) - Σ(OUT)` y `difference = closingBalance - expectedBalance`, ambos persistidos como snapshot. |
| RN-CASH-05 | `CashMovement.reason` es obligatorio si `paymentId` es `NULL` (movimiento manual); no se exige si viene de un `Payment`. |
| RN-CASH-06 | Un `CashMovement` solo puede registrarse contra una `CashSession` abierta. |
| RN-CASH-07 | Autorización de escritura: `ROLES_THAT_CAN_MANAGE_COMPANY`. Lectura: cualquier miembro activo. |
| RN-CASH-08 | Alta de sesión/movimiento genera una única auditoría. |
| RN-BANK-01 | `BankAccount` pertenece a la `Company`. |
| RN-BANK-02 | `BankMovement.isReconciled` queda siempre `false` — sin lógica de conciliación en este sub-sprint (§0.2). |
| RN-BANK-03 | `BankMovement.description` es obligatorio si `paymentId` es `NULL` (mismo criterio que RN-CASH-05). |
| RN-BANK-04 | Autorización de escritura: `ROLES_THAT_CAN_MANAGE_COMPANY`. Lectura: cualquier miembro activo. |
| RN-PAY-10 | Un `Payment` con algún medio `requiresCashMovement` exige `cashSessionId` (sesión abierta, misma empresa) y genera un `CashMovement` por la suma de esos medios; con algún medio `requiresBankMovement` exige `bankAccountId` (cuenta activa, misma empresa) y genera un `BankMovement` análogo — ambos en la misma transacción que crea el `Payment` (§0.1). |

## 3. Endpoints

Todos **[CTX]**.

Nota de implementación (§0.4-bis, ajuste menor no arquitectónico): las
acciones sobre una caja puntual (`GET`/`PATCH`/activar/desactivar/
sesiones) quedan **también** nesteadas bajo
`branches/:branchId` — mismo controller único que `Warehouse`/
`PointOfSale` (Sprint 3.2/3.3), en vez de partir la caja en dos
controllers con prefijos distintos. `CashSession` (cerrar/movimientos),
en cambio, sí es un recurso plano bajo `companies/:id/cash-sessions/:id`,
porque sus operaciones ya no necesitan el contexto de sucursal.

| Método | Endpoint | Caso de uso | Autorización |
|---|---|---|---|
| `POST` | `/companies/:id/branches/:branchId/cash-registers` | `CreateCashRegisterUseCase` | RN-CASH-07 |
| `GET` | `/companies/:id/branches/:branchId/cash-registers` | `ListCashRegistersUseCase` | Miembro activo |
| `GET` | `/companies/:id/branches/:branchId/cash-registers/:id` | `GetCashRegisterByIdUseCase` | Miembro activo |
| `PATCH` | `/companies/:id/branches/:branchId/cash-registers/:id` | `UpdateCashRegisterUseCase` | RN-CASH-07 |
| `POST` | `/companies/:id/branches/:branchId/cash-registers/:id/deactivate` \| `/activate` | `De/ActivateCashRegisterUseCase` | RN-CASH-07 |
| `POST` | `/companies/:id/branches/:branchId/cash-registers/:id/sessions` | `OpenCashSessionUseCase` | RN-CASH-07 |
| `GET` | `/companies/:id/branches/:branchId/cash-registers/:id/sessions` | `ListCashSessionsUseCase` | Miembro activo |
| `POST` | `/companies/:id/cash-sessions/:sessionId/close` | `CloseCashSessionUseCase` | RN-CASH-07 |
| `POST` | `/companies/:id/cash-sessions/:sessionId/movements` | `CreateCashMovementUseCase` (manual) | RN-CASH-07 |
| `GET` | `/companies/:id/cash-sessions/:sessionId/movements` | `ListCashMovementsUseCase` | Miembro activo |
| `POST` | `/companies/:id/bank-accounts` | `CreateBankAccountUseCase` | RN-BANK-04 |
| `GET` | `/companies/:id/bank-accounts` | `ListBankAccountsUseCase` | Miembro activo |
| `GET` | `/companies/:id/bank-accounts/:id` | `GetBankAccountByIdUseCase` | Miembro activo |
| `PATCH` | `/companies/:id/bank-accounts/:id` | `UpdateBankAccountUseCase` | RN-BANK-04 |
| `POST` | `/companies/:id/bank-accounts/:id/deactivate` \| `/activate` | `De/ActivateBankAccountUseCase` | RN-BANK-04 |
| `POST` | `/companies/:id/bank-accounts/:id/movements` | `CreateBankMovementUseCase` (manual) | RN-BANK-04 |
| `GET` | `/companies/:id/bank-accounts/:id/movements` | `ListBankMovementsUseCase` | Miembro activo |

`POST /companies/:id/payments` (Sprint 3.4) no gana un endpoint nuevo —
acepta los dos campos opcionales de §0.1 en el mismo request.

## 4. Casos de uso — notas de implementación

- **`ApplyCashMovementService`/`ApplyBankMovementService`** (nuevos,
  `treasury/application/services/`): encapsulan "crear el movimiento
  dentro de una sesión/cuenta ya validada", reutilizados tanto por los
  casos de uso manuales como por el retrofit de `CreatePaymentUseCase` —
  mismo principio de "recibe `ctx`, no abre su propia transacción" que
  `ApplyStockMovementService`/`ApplyCustomerAccountMovementService`.
- **`CreatePaymentUseCase`** (extendido): resuelve, antes de la
  transacción, cuánto del `totalAmount` corresponde a medios con
  `requiresCashMovement`/`requiresBankMovement`; valida `cashSessionId`
  (abierta, misma empresa) / `bankAccountId` (activa, misma empresa) si
  corresponde; dentro de la transacción, además de lo que ya hacía en
  Sprint 3.4, llama a `ApplyCashMovementService`/`ApplyBankMovementService`.
- **`CloseCashSessionUseCase`**: sólo necesita `CashSessionRepository`
  (encuentra la sesión, suma sus movimientos) — no depende de
  `ApplyCashMovementService` porque no crea un movimiento, solo calcula y
  persiste el cierre.
- Cross-módulo: sin nuevas dependencias — `treasury` ya tenía acceso a
  `BranchRepository`/`CompanyRepository` desde Sprint 3.3/3.4 vía el
  mismo patrón de registro de providers.

## 5. Pruebas

### 5.1 Unitarias

- `CashRegister`/`BankAccount`: mismo patrón CRUD que `Warehouse`
  (Sprint 3.2) — creación, rechazo de sucursal/empresa ajena, activar/
  desactivar.
- `OpenCashSessionUseCase`: rechazo si ya hay una sesión abierta en el
  mismo `CashRegister` (RN-CASH-02), rechazo de `openingBalance` negativo.
- `CloseCashSessionUseCase`: `expectedBalance`/`difference` calculados
  correctamente con movimientos IN/OUT mixtos; rechazo si la sesión ya
  está cerrada.
- `CreateCashMovementUseCase`/`CreateBankMovementUseCase` (manuales):
  exige `reason`/`description`, rechaza sesión cerrada.
- `CreatePaymentUseCase` (extendido): un cobro en efectivo genera
  `CashMovement` tipo `IN`; un pago con cheque **no** genera movimiento de
  caja ni banco (Cheque no lo requiere); un cobro con Transferencia genera
  `BankMovement` tipo `DEPOSIT`; rechazo si falta `cashSessionId`/
  `bankAccountId` cuando el medio lo requiere; rechazo si la sesión/cuenta
  no es de la misma empresa o la sesión no está abierta.

### 5.2 Integración (contra `estrategos_test`)

- Rollback real de `OpenCashSessionUseCase`/`CreatePaymentUseCase`
  (extendido): forzar falla en auditoría, verificar que no queda sesión/
  movimiento huérfano.
- Camino feliz de punta a punta: abrir sesión → cobro en efectivo
  (`CashMovement` creado, ligado al `Payment`) → cerrar sesión
  (`expectedBalance` coincide con `openingBalance + monto cobrado`).

### 5.3 End-to-end manual (`curl`)

Alta de caja y cuenta bancaria, apertura de sesión de caja, Factura +
cobro parcial en efectivo (verificación de `CashMovement` y saldo de caja
esperado), cobro del resto por transferencia (verificación de
`BankMovement`), cierre de sesión (verificación de `expectedBalance`/
`difference`), movimiento manual de caja sin `Payment` (verificación de
`reason` exigido), rechazo de abrir una segunda sesión en la misma caja.

## 6. Archivos a tocar

- `apps/api/prisma/schema.prisma` — `CashRegister`, `CashSession`,
  `CashMovement`, `BankAccount`, `BankMovement`, enums nuevos, migración.
- `apps/api/src/modules/treasury/**` — nuevos casos de uso, entidades,
  repositorios, controllers dentro del módulo existente.
- `apps/api/src/modules/treasury/application/use-cases/create-payment.use-case.ts` — extendido (§0.1).
- `apps/api/test/treasury/**` — unitarios + integration-spec nuevos.
- `CHANGELOG.md` — nueva versión al cerrar el módulo (cierre del núcleo
  financiero completo, Sprints 3.1 a 3.5).

## 7. Resultado real (verificado, no supuesto)

- ✅ `npx tsc --noEmit`: 0 errores.
- ✅ `npx eslint`: 0 errores.
- ✅ `npx jest` (unitarios): **296/296 tests** (41 nuevos de este
  sub-sprint: 8 de `CashRegister` CRUD + 13 de `CashSession`/
  `CashMovement` (abrir/cerrar/movimiento manual) + 11 de `BankAccount`
  CRUD/`BankMovement` manual + 9 nuevos en `CreatePaymentUseCase` para
  RN-PAY-10; el resto heredado sin regresiones).
- ✅ `npm run test:integration`: **21/21 tests de integración** contra
  Postgres real, incluyendo 3 nuevos (`CashSession`: camino feliz abrir→
  movimientos manuales→cerrar con `expectedBalance` exacto, rollback de
  apertura, RN-CASH-02 con dos sesiones) y el retrofit de
  `CreatePaymentUseCase` (cobro en efectivo genera `CashMovement`
  verificado en `test/treasury/create-payment.integration-spec.ts`).
- ✅ Migración `caja_bancos` aplicada contra `estrategos_dev` y
  `estrategos_test`, sin backfill necesario (todas las columnas nuevas
  son de tablas nuevas).
- ✅ `nest build` limpio, servidor arrancado desde `dist/main.js` con las
  rutas nuevas mapeadas (`cash-registers`, `cash-sessions`,
  `bank-accounts`, todas anidadas correctamente) y sin errores de
  resolución de dependencias (`CreatePaymentUseCase` ahora inyecta
  `CashSessionRepository`/`BankAccountRepository`/
  `ApplyCashMovementService`/`ApplyBankMovementService` además de lo que
  ya tenía desde Sprint 3.4).
- ✅ Verificación end-to-end manual con `curl` contra `estrategos_dev`:
  alta de caja y cuenta bancaria, rechazo de saldo de apertura negativo,
  apertura de sesión, rechazo de una segunda sesión en la misma caja
  (RN-CASH-02), Factura de Venta ($1210), cobro parcial en efectivo
  ($500, `CashMovement` `IN` verificado ligado al `Payment`), cobro del
  resto por transferencia ($710, `BankMovement` `DEPOSIT` verificado),
  movimiento manual de caja rechazado sin motivo y aceptado con motivo,
  cierre de sesión con `expectedBalance` = `openingBalance` (0) + IN
  automático (500) + IN manual (100) = **600**, coincidiendo exacto con
  `closingBalance` informado (`difference` = 0), y rechazo de un cobro en
  efectivo sin `cashSessionId`.

### Desviaciones y hallazgos durante la implementación (no estaban en el plan original)

1. **Bug real de `decimal.js` detectado por los tests, no por `tsc`/lint**:
   `Decimal.prototype.isPositive()` en `decimal.js` considera `0` como
   positivo (solo excluye negativos) — no es "estrictamente mayor a
   cero" como el nombre sugiere. El código nuevo de este sub-sprint
   (`CreatePaymentUseCase` para `cashAmount`/`bankAmount`,
   `CreateCashMovementUseCase`, `CreateBankMovementUseCase`) usaba
   `isPositive()` para exactamente ese chequeo y fallaba: con un único
   medio de pago sin requerimiento de caja/banco (`bankAmount = 0`), el
   caso de uso igual exigía `bankAccountId` porque `0.isPositive()` daba
   `true`. Se detectó al correr la suite completa de tests unitarios (10
   tests fallando con errores cruzados de "falta caja"/"falta banco" en
   escenarios que no debían dispararlos) — nunca durante `tsc --noEmit`
   ni `eslint`, porque el código es sintácticamente válido. Corregido en
   los 3 archivos usando `.greaterThan(0)` en su lugar. Se aprovechó el
   mismo hallazgo para corregir una instancia preexistente del mismo
   patrón en `CreateVoucherUseCase` (Sprint 3.3,
   `InvalidVoucherLineQuantityError`), donde una cantidad de línea
   exactamente `0` no era rechazada — bug real, aunque de menor impacto
   práctico (una cantidad de `0` en una línea de comprobante es un caso
   de borde poco probable, pero incorrecto igual). Se verificó que
   `create-stock-adjustment.use-case.ts`/`create-stock-transfer.use-case.ts`
   (Sprint 3.2) ya tenían la guarda adicional `|| quantity.isZero()`, por
   lo que no necesitaron corrección.
2. **Ajuste de rutas respecto al primer borrador del documento (§3)**:
   las acciones de una caja puntual (`GET`/`PATCH`/activar/desactivar/
   sesiones) se implementaron anidadas bajo `branches/:branchId`, no como
   recurso plano `companies/:id/cash-registers/:id` como se había
   escrito inicialmente en este documento — para reusar exactamente el
   mismo patrón de un único controller que ya usan `Warehouse`
   (Sprint 3.2) y `PointOfSale` (Sprint 3.3), en vez de partir `CashRegister`
   en dos controllers con prefijos distintos sin necesidad real. Detalle
   de implementación, no una decisión de arquitectura nueva — el
   documento ya se actualizó en §3 para reflejarlo.
