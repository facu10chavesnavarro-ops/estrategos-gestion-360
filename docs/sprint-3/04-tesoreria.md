# Sprint 3 — Sub-sprint 4: Tesorería (Pagos y Cuentas Corrientes)

Implementa §1.7, §1.8, §13, §14, §15 de
`docs/sprint-3/00-arquitectura-nucleo-financiero.md` (documento de
arquitectura ya aprobado, incluyendo la Decisión 1.7: cuentas separadas
Cliente/Proveedor). Cuarto sub-sprint del plan de §18 — depende de Sprint
3.3 (`Voucher`) para poder imputar pagos a comprobantes. Estado: **en
implementación.**

## 0. Decisiones de esta etapa

Ídem sub-sprints anteriores: implementación de decisiones ya aprobadas,
más refinamientos de bajo riesgo documentados por transparencia (no
requieren nueva aprobación — ver criterio en cada punto).

### 0.1 `Voucher` pasa a afectar la Cuenta Corriente (retrofit de Sprint 3.3)

El documento de arquitectura (§8, §9.2) especifica que cada `VoucherType`
tiene un campo `affectsCurrentAccount` (`DEBIT`\|`CREDIT`\|`NONE`) y que
una Factura de Venta genera una deuda del cliente, una Factura de Compra
una deuda hacia el proveedor, y una Nota de Crédito invierte el efecto del
comprobante que referencia. Sprint 3.3 **difirió explícitamente** este
campo (§0.1 de `docs/sprint-3/03-comprobantes.md`: "no se agrega todavía
... se agrega en ese sub-sprint") porque `CurrentAccount` no existía. Este
no es un cambio de alcance nuevo — es completar lo ya aprobado.

Concretamente:

- Se agrega `VoucherType.affectsCurrentAccount` (`DEBIT`\|`CREDIT`\|`NONE`)
  al schema, con los mismos 7 tipos ya sembrados actualizando su valor:
  `FA_*` → `DEBIT` (aumenta lo que nos debe el cliente), `NC_*` → `CREDIT`
  (lo reduce), `FC` → `CREDIT` (aumenta lo que le debemos al proveedor —
  ver convención de signo en §0.3).
- `CreateVoucherUseCase` (Sprint 3.3) se extiende: dentro de la misma
  transacción que ya crea el `Voucher`/`VoucherLine`/`StockMovement`,
  aplica también el movimiento de cuenta corriente vía el nuevo
  `ApplyCustomerAccountMovementService`/`ApplySupplierAccountMovementService`
  (según `voucherType.flow`), si `affectsCurrentAccount != NONE`.
- No cambia ningún endpoint ni el contrato de request/response de
  `POST /companies/:id/vouchers` — es una escritura adicional interna, no
  un campo nuevo que el cliente deba enviar. Se re-corren los tests
  existentes de `CreateVoucherUseCase` para confirmar que no hay
  regresión, y se agregan los nuevos que verifican el efecto en cuenta
  corriente.

### 0.2 Alcance recortado: `CashMovement`/`BankMovement` quedan fuera de este sub-sprint

El documento de arquitectura (§14) dice que un `Payment` genera, según
corresponda, una fila en `CurrentAccountMovement` (siempre), en
`CashMovement` (si el medio es Efectivo) y en `BankMovement` (si el medio
se liquida en banco). El propio §18 ya planifica esta secuencia:
`CashRegister`/`CashSession`/`CashMovement`/`BankAccount`/`BankMovement`
son *Sprint 3.5*, posterior a este, "porque dependen de 3.4 (`Payment`)
para saber qué movimiento generar" — no al revés. En este sub-sprint,
`CreatePaymentUseCase` genera siempre su `CurrentAccountMovement`, pero
**no** genera todavía movimiento de caja/banco (esas tablas no existen).
Esto no es una decisión nueva, es respetar el orden ya aprobado en §18.

### 0.3 Convención de signo unificada entre `CustomerAccount` y `SupplierAccount`

El documento (§15) es explícito: aun separando las cuentas por rol
(Decisión 1.7-B), **ambas usan la misma convención de signo** — saldo
positivo = nos deben, saldo negativo = les debemos ("`CustomerAccount`
casi siempre será positivo y `SupplierAccount` casi siempre negativo, por
la naturaleza de cada relación"). Se implementa así, sin convenciones
separadas por tabla:

- `CurrentAccountMovement.type = DEBIT` → aumenta el saldo (`+amount`).
- `CurrentAccountMovement.type = CREDIT` → disminuye el saldo (`-amount`).
- Un `Voucher` de Venta (`FA_*`, `affectsCurrentAccount = DEBIT`) aumenta
  `CustomerAccount.currentBalance` (nos deben más).
- Un `Voucher` de Compra (`FC`, `affectsCurrentAccount = CREDIT`)
  disminuye `SupplierAccount.currentBalance` (le debemos más al
  proveedor — el saldo se vuelve más negativo).
- Un `Payment` de cobro (`direction = COLLECTION`) genera un movimiento
  `CREDIT` sobre `CustomerAccount` (reduce lo que nos debe).
- Un `Payment` de pago (`direction = PAYMENT`) genera un movimiento
  `DEBIT` sobre `SupplierAccount` (reduce, hacia cero, lo que le
  debemos).

### 0.4 `CustomerAccount`/`SupplierAccount` se crean implícitamente (upsert), sin alta manual

Mismo patrón que `Stock` (§6.3 del documento de arquitectura): la cuenta
corriente no tiene un endpoint de alta — se materializa automáticamente
en el primer movimiento (`upsert`), con saldo inicial `0`. No existe
riesgo de "olvidarse de crear la cuenta antes de facturar".

### 0.5 `PaymentMethod`: catálogo global sembrado, sin tabla de detalle para Efectivo/Transferencia/Cuenta Corriente

Siguiendo §13.2-B ya aprobada: 6 filas (`EFECTIVO`, `CHEQUE`,
`TRANSFERENCIA`, `TARJETA_DEBITO`, `TARJETA_CREDITO`,
`CUENTA_CORRIENTE`), cada una con `requiresCashMovement`/
`requiresBankMovement` (booleanos, consumidos recién en Sprint 3.5 para
decidir qué tabla de movimiento generar — hoy no tienen lector, pero
completan el dato de catálogo para no tener que volver a tocarlo). Solo
`CHEQUE` y las dos tarjetas tienen tabla de detalle propia
(`CheckDetail`/`CardDetail`); Efectivo/Transferencia/Cuenta Corriente se
registran con el monto y una referencia de texto libre opcional en
`PaymentMethodDetail.reference`, sin tabla adicional — no tienen datos ni
reglas propias que lo justifiquen (mismo criterio que evitó una tabla de
detalle por cada tipo en el documento de arquitectura).

`CUENTA_CORRIENTE` como medio de pago no tiene ninguna lógica especial en
el código: un `Payment` genera su `CurrentAccountMovement` sin importar
qué medios lo componen; `PaymentMethod` solo clasifica si ese medio,
además, algún día (Sprint 3.5) también debería mover caja o banco. Elegir
`CUENTA_CORRIENTE` simplemente dice "este dinero no pasó por caja ni
banco" (`requiresCashMovement = requiresBankMovement = false`), sin más
significado que ese.

### 0.6 `CardDetail` deliberadamente mínimo

El documento de arquitectura menciona `CardDetail` sin especificar campos
más allá de "tipo, cupón, lote, entidad de liquidación" (§13.2, tabla
resumen). A diferencia de `CheckDetail` (que sí tiene un ciclo de vida
real y explícito — `status`: en cartera/depositado/rechazado/cobrado,
`dueDate` para seguimiento), no hay ningún estado ni regla de negocio
descrita para tarjetas más allá de guardar datos de referencia. Se
modela con 3 campos opcionales de texto libre
(`authorizationCode`, `batchNumber`, `settlementEntity`), sin ciclo de
vida — agregar reglas (ej. conciliación con el resumen de la financiera)
queda para cuando haya un caso de uso real que lo requiera, igual que se
hizo con Remito/Orden de Compra en Sprint 3.3.

### 0.7 `PaymentAllocation`: no se permite sobre-imputar un comprobante

Regla nueva no escrita explícitamente en el documento de arquitectura,
pero necesaria para que "pagos parciales que cubren varios comprobantes"
(§1.8) sea una garantía real y no solo una posibilidad de esquema: la
suma de `amountApplied` de todas las imputaciones de **todos** los pagos
sobre un mismo `Voucher` no puede superar su `total`. Se verifica en
`CreatePaymentUseCase` sumando las imputaciones ya existentes de cada
comprobante referenciado antes de aceptar las nuevas, dentro de la misma
transacción (evita condiciones de carrera entre dos pagos concurrentes
sobre el mismo comprobante, igual que RN-VOU-02 evita huecos de
numeración).

## 1. Modelo de datos

### 1.1 `PaymentMethod` (catálogo global, sembrado — igual que `VoucherType`/`Role`)

```prisma
model PaymentMethod {
  id                  String  @id @default(uuid())
  code                String  @unique // EFECTIVO, CHEQUE, TRANSFERENCIA, TARJETA_DEBITO, TARJETA_CREDITO, CUENTA_CORRIENTE
  name                String
  requiresCheckDetail Boolean @default(false) @map("requires_check_detail")
  requiresCardDetail  Boolean @default(false) @map("requires_card_detail")
  requiresCashMovement Boolean @default(false) @map("requires_cash_movement")
  requiresBankMovement Boolean @default(false) @map("requires_bank_movement")
  isActive            Boolean @default(true) @map("is_active")

  @@map("payment_methods")
}
```

### 1.2 `CheckDetail` / `CardDetail`

```prisma
enum CheckStatus {
  EN_CARTERA
  DEPOSITADO
  RECHAZADO
  COBRADO
}

model CheckDetail {
  id         String      @id @default(uuid())
  number     String
  bankName   String      @map("bank_name")
  dueDate    DateTime    @map("due_date")
  status     CheckStatus @default(EN_CARTERA)
  createdAt  DateTime    @default(now()) @map("created_at")

  @@map("check_details")
}

model CardDetail {
  id                String   @id @default(uuid())
  authorizationCode String?  @map("authorization_code")
  batchNumber       String?  @map("batch_number")
  settlementEntity  String?  @map("settlement_entity")
  createdAt         DateTime @default(now()) @map("created_at")

  @@map("card_details")
}
```

No se agrega ninguna lógica de cambio de estado de `CheckDetail` en este
sub-sprint (ej. "marcar como depositado/rechazado") — el campo `status`
se deja en `EN_CARTERA` al crear el pago; un endpoint de transición
queda fuera de alcance hasta que exista `CashSession`/`BankMovement`
(Sprint 3.5) que sea el disparador real de esos cambios.

### 1.3 `Payment` / `PaymentAllocation` / `PaymentMethodDetail` (UUID v7 — alto volumen)

```prisma
enum PaymentDirection {
  COLLECTION
  PAYMENT
}

model Payment {
  id              String           @id
  companyId       String           @map("company_id")
  partyId         String           @map("party_id")
  direction       PaymentDirection
  date            DateTime
  currency        String
  exchangeRate    Decimal          @default(1) @map("exchange_rate") @db.Decimal(10, 4)
  totalAmount     Decimal          @map("total_amount") @db.Decimal(14, 2)
  createdByUserId String           @map("created_by_user_id")
  createdAt       DateTime         @default(now()) @map("created_at")

  allocations    PaymentAllocation[]
  methodDetails  PaymentMethodDetail[]

  @@index([companyId, createdAt])
  @@index([partyId])
  @@map("payments")
}

model PaymentAllocation {
  id            String  @id
  paymentId     String  @map("payment_id")
  voucherId     String  @map("voucher_id")
  amountApplied Decimal @map("amount_applied") @db.Decimal(14, 2)

  @@index([paymentId])
  @@index([voucherId])
  @@map("payment_allocations")
}

model PaymentMethodDetail {
  id              String  @id
  paymentId       String  @map("payment_id")
  paymentMethodId String  @map("payment_method_id")
  amount          Decimal @db.Decimal(14, 2)
  reference       String?
  checkDetailId   String? @unique @map("check_detail_id")
  cardDetailId    String? @unique @map("card_detail_id")

  @@index([paymentId])
  @@map("payment_method_details")
}
```

### 1.4 `CustomerAccount` / `SupplierAccount` / `CurrentAccountMovement`

```prisma
enum CurrentAccountMovementType {
  DEBIT
  CREDIT
}

model CustomerAccount {
  id             String  @id @default(uuid())
  companyId      String  @map("company_id")
  customerId     String  @unique @map("customer_id")
  currentBalance Decimal @default(0) @map("current_balance") @db.Decimal(14, 2)

  movements CustomerAccountMovement[]

  @@map("customer_accounts")
}

model CustomerAccountMovement {
  id                String                     @id
  customerAccountId String                     @map("customer_account_id")
  type              CurrentAccountMovementType
  amount            Decimal                    @db.Decimal(14, 2)
  balanceAfter       Decimal                    @map("balance_after") @db.Decimal(14, 2)
  voucherId         String?                    @map("voucher_id")
  paymentId         String?                    @map("payment_id")
  createdAt         DateTime                   @default(now()) @map("created_at")

  @@index([customerAccountId, createdAt])
  @@map("customer_account_movements")
}

model SupplierAccount {
  id             String  @id @default(uuid())
  companyId      String  @map("company_id")
  supplierId     String  @unique @map("supplier_id")
  currentBalance Decimal @default(0) @map("current_balance") @db.Decimal(14, 2)

  movements SupplierAccountMovement[]

  @@map("supplier_accounts")
}

model SupplierAccountMovement {
  id                String                     @id
  supplierAccountId String                     @map("supplier_account_id")
  type              CurrentAccountMovementType
  amount            Decimal                    @db.Decimal(14, 2)
  balanceAfter      Decimal                    @map("balance_after") @db.Decimal(14, 2)
  voucherId         String?                    @map("voucher_id")
  paymentId         String?                    @map("payment_id")
  createdAt         DateTime                   @default(now()) @map("created_at")

  @@index([supplierAccountId, createdAt])
  @@map("supplier_account_movements")
}
```

`CustomerAccount`/`SupplierAccount` con tablas separadas (no una tabla
`CurrentAccount` genérica con un discriminador) — mismo criterio ya usado
para `Customer`/`Supplier` (Sprint 2): cada uno referencia directamente a
su tabla de rol (`customerId`/`supplierId`, `@unique` — a lo sumo una
cuenta por Cliente/Proveedor), sin una columna de tipo que distinga entre
dos significados dentro de la misma tabla.

Además de las 4 tablas anteriores, `VoucherType` gana una columna:

```prisma
enum CurrentAccountEffect {
  DEBIT
  CREDIT
  NONE
}
// en VoucherType:
affectsCurrentAccount CurrentAccountEffect @map("affects_current_account")
```

## 2. Reglas de negocio

| ID | Regla |
|---|---|
| RN-PAY-01 | Todo `Payment` pertenece a una `Company`; la contraparte (`partyId`) debe tener el rol correspondiente a `direction` activo: `COLLECTION` exige `Customer` activo, `PAYMENT` exige `Supplier` activo (mismo criterio que RN-VOU-04). |
| RN-PAY-02 | `totalAmount` debe ser igual a la suma de `PaymentMethodDetail.amount` — se valida, nunca se informa de forma independiente (mismo principio que RN-VOU-09). |
| RN-PAY-03 | La suma de `PaymentAllocation.amountApplied` de un `Payment` no puede superar su `totalAmount` (un pago no puede imputar más de lo cobrado/pagado). Puede ser menor (queda a favor en la cuenta corriente, sin fila en `PaymentAllocation` para ese remanente). |
| RN-PAY-04 | Cada `voucherId` referenciado en `PaymentAllocation` debe existir, pertenecer a la misma empresa y al mismo `partyId` que el `Payment`. |
| RN-PAY-05 | La suma de `amountApplied` de **todos** los pagos ya imputados a un `Voucher` más los nuevos no puede superar `Voucher.total` (RN-PAY nueva, §0.7) — evita sobre-imputación entre pagos distintos. |
| RN-PAY-06 | `Payment` es inmutable una vez creado — no existe edición ni anulación directa (mismo criterio que RN-VOU-03 sobre `Voucher`). |
| RN-PAY-07 | Si algún `PaymentMethodDetail.paymentMethodId` corresponde a `CHEQUE`, ese detalle exige un `CheckDetail` (`number`, `bankName`, `dueDate`); análogamente `TARJETA_DEBITO`/`TARJETA_CREDITO` admiten (no exigen) un `CardDetail`. |
| RN-PAY-08 | Autorización de escritura: `ROLES_THAT_CAN_MANAGE_COMPANY`. Lectura: cualquier miembro activo. |
| RN-PAY-09 | Alta de un `Payment` genera una única auditoría (`payment.create`, metadata `{ direction, partyId, totalAmount }`), no una por imputación ni por medio de pago. |
| RN-CTA-01 | `CustomerAccount`/`SupplierAccount` se crean implícitamente (`upsert`) en el primer movimiento — no existe alta manual (§0.4). |
| RN-CTA-02 | `CurrentAccountMovement` (`Customer`/`SupplierAccountMovement`) es inmutable; `balanceAfter` es un snapshot del saldo resultante, no se recalcula después. |
| RN-CTA-03 | Convención de signo unificada (§0.3): `DEBIT` aumenta el saldo, `CREDIT` lo disminuye, para ambas tablas de cuenta. |
| RN-CTA-04 | Un `Voucher` confirmado con `VoucherType.affectsCurrentAccount != NONE` genera su movimiento de cuenta corriente en la misma transacción que su alta (retrofit de `CreateVoucherUseCase`, §0.1). |

## 3. Endpoints

Todos **[CTX]** salvo el catálogo global.

| Método | Endpoint | Caso de uso | Autorización |
|---|---|---|---|
| `GET` | `/payment-methods` (sin `[CTX]`) | `ListPaymentMethodsUseCase` | Cualquier usuario autenticado |
| `POST` | `/companies/:id/payments` | `CreatePaymentUseCase` | RN-PAY-08 |
| `GET` | `/companies/:id/payments` | `ListPaymentsUseCase` (filtros `partyId`, `direction`, rango de fecha) | Miembro activo |
| `GET` | `/companies/:id/payments/:paymentId` | `GetPaymentByIdUseCase` (incluye imputaciones + medios) | Miembro activo |
| `GET` | `/companies/:id/customers/:customerId/current-account` | `GetCustomerCurrentAccountUseCase` (saldo + movimientos) | Miembro activo |
| `GET` | `/companies/:id/suppliers/:supplierId/current-account` | `GetSupplierCurrentAccountUseCase` (saldo + movimientos) | Miembro activo |

`CreateVoucherUseCase` (Sprint 3.3) no gana un endpoint nuevo — se
extiende internamente (§0.1), mismo contrato de request/response.

## 4. Casos de uso — notas de implementación

- **`ApplyCustomerAccountMovementService`/`ApplySupplierAccountMovementService`**
  (nuevos, módulo `treasury/application/services/`): mismo principio que
  `ApplyStockMovementService` (Sprint 3.3) — reciben `ctx` en vez de abrir
  su propia transacción, para poder combinarse con la creación de un
  `Voucher` o de un `Payment`. Cada uno hace `upsert` de su cuenta
  (creándola en `0` si no existe) y `create` del movimiento
  correspondiente, aplicando la convención de signo de §0.3.
- **`CreateVoucherUseCase`** (extendido): al confirmar, si
  `voucherType.affectsCurrentAccount != NONE`, llama al servicio de cuenta
  corriente que corresponda según `voucherType.flow`
  (`SALE` → `ApplyCustomerAccountMovementService`, `PURCHASE` →
  `ApplySupplierAccountMovementService`), pasándole `voucherId` como
  origen del movimiento.
- **`CreatePaymentUseCase`** (módulo nuevo `treasury`): valida rol,
  contraparte activa (RN-PAY-01), suma de medios = `totalAmount`
  (RN-PAY-02), suma de imputaciones ≤ `totalAmount` (RN-PAY-03) y ≤ saldo
  pendiente de cada comprobante (RN-PAY-04/05); dentro de `unitOfWork.run`:
  crea `Payment` + `PaymentAllocation`(s) + `PaymentMethodDetail`(s) (y su
  `CheckDetail`/`CardDetail` si corresponde), aplica el movimiento de
  cuenta corriente vía el servicio que corresponda según `direction`,
  registra una única auditoría.
- Cross-módulo: `treasury` registra como providers propios
  `PrismaCustomerRepository`/`PrismaSupplierRepository` (customers/
  suppliers), `PrismaVoucherRepository` (vouchers), `PrismaCompanyRepository`
  (companies) — mismo patrón ya usado en `vouchers.module.ts`.
- `ListPaymentMethodsUseCase` no es `[CTX]`: catálogo global de plataforma
  (mismo criterio que `GET /voucher-types`).

## 5. Pruebas

### 5.1 Unitarias

- `ApplyCustomerAccountMovementService`/`ApplySupplierAccountMovementService`:
  primer movimiento crea la cuenta en `0` y aplica el signo correcto,
  movimientos sucesivos acumulan el saldo, `balanceAfter` coincide con el
  saldo resultante.
- `CreateVoucherUseCase` (regresión + nuevo): sigue funcionando igual que
  en Sprint 3.3 para lo ya cubierto; nuevo — una Factura de Venta aumenta
  `CustomerAccount`, una Factura de Compra disminuye `SupplierAccount`,
  una Nota de Crédito revierte el efecto.
- `CreatePaymentUseCase`: cobro total de una factura (imputación 1 a 1),
  cobro parcial (queda saldo pendiente), cobro que cubre dos facturas a
  la vez, pago repartido entre Efectivo y Transferencia, rechazo si la
  suma de medios no coincide con `totalAmount` (RN-PAY-02), rechazo de
  sobre-imputación (RN-PAY-03/05), rechazo si el comprobante referenciado
  es de otra empresa o de otra contraparte (RN-PAY-04), rechazo si la
  contraparte no está activa (RN-PAY-01).
- `PaymentMethod`/`CheckDetail`/`CardDetail`: mapeo correcto según el
  medio informado.

### 5.2 Integración (contra `estrategos_test`)

- Rollback real de `CreatePaymentUseCase`: forzar falla en auditoría,
  verificar que no queda `Payment`, `PaymentAllocation`,
  `PaymentMethodDetail` ni cambio en `CustomerAccount`/`SupplierAccount`.
- Rollback real del retrofit de `CreateVoucherUseCase`: verificar que una
  falla posterior a crear el `Voucher` tampoco deja un movimiento de
  cuenta corriente huérfano.
- Camino feliz de punta a punta: Factura de Venta → saldo del cliente
  sube → cobro parcial → saldo baja lo cobrado, con `balanceAfter`
  correcto en ambos movimientos.

### 5.3 End-to-end manual (`curl`)

Factura de Venta (verificación de saldo del cliente), cobro parcial en
efectivo (verificación de saldo remanente), cobro del saldo restante
combinando Transferencia + Cuenta Corriente, Factura de Compra
(verificación de saldo del proveedor, negativo), pago al proveedor con un
cheque (`CheckDetail` creado con `EN_CARTERA`), rechazo de un pago cuya
suma de medios no coincide con el total, rechazo de sobre-imputación.

## 6. Archivos a tocar

- `apps/api/prisma/schema.prisma` — `PaymentMethod`, `CheckDetail`,
  `CardDetail`, `Payment`, `PaymentAllocation`, `PaymentMethodDetail`,
  `CustomerAccount`, `CustomerAccountMovement`, `SupplierAccount`,
  `SupplierAccountMovement`, enums nuevos, columna
  `VoucherType.affectsCurrentAccount`, migración.
- `apps/api/prisma/seed.ts` — 6 filas de `PaymentMethod`, actualización de
  las 7 filas de `VoucherType` con `affectsCurrentAccount`.
- `apps/api/src/modules/vouchers/application/use-cases/create-voucher.use-case.ts` — extendido (§0.1).
- `apps/api/src/modules/vouchers/vouchers.module.ts` — registra los dos
  nuevos servicios de cuenta corriente.
- `apps/api/src/modules/treasury/**` — módulo nuevo completo (dominio,
  aplicación, infraestructura, presentación).
- `apps/api/test/vouchers/**` — tests de `CreateVoucherUseCase`
  actualizados con el nuevo efecto en cuenta corriente.
- `apps/api/test/treasury/**` — unitarios + integration-spec de rollback.
- `CHANGELOG.md` — nueva versión al cerrar el módulo.

## 7. Resultado real (verificado, no supuesto)

- ✅ `npx tsc --noEmit`: 0 errores.
- ✅ `npx eslint`: 0 errores.
- ✅ `npx jest` (unitarios): **255/255 tests** (21 nuevos de este módulo: 5
  de `ApplyCustomerAccountMovementService`/`ApplySupplierAccountMovementService`
  + 16 de `CreatePaymentUseCase`; más 2 nuevos en `CreateVoucherUseCase`
  verificando el retrofit de cuenta corriente; el resto heredado sin
  regresiones).
- ✅ `npm run test:integration`: **18/18 tests de integración** contra
  Postgres real, incluyendo 3 nuevos de `CreatePaymentUseCase` (camino
  feliz Factura→cobro parcial→saldo correcto, pago con Cheque/`CheckDetail`,
  rollback forzando fallo de auditoría) y el retrofit de
  `CreateVoucherUseCase` (una Factura de Venta ahora también verifica el
  saldo de `CustomerAccount` resultante, y su rollback).
- ✅ Migración `treasury` aplicada contra `estrategos_dev` y
  `estrategos_test`, incluyendo el backfill de
  `VoucherType.affectsCurrentAccount` para las 7 filas ya sembradas
  (`ALTER TABLE ... ADD COLUMN` nullable → `UPDATE` según
  `flow`/`is_credit_note` → `SET NOT NULL`, sin downtime de escritura).
  Catálogo `PaymentMethod` sembrado en ambas bases (6 filas).
- ✅ `nest build` limpio, servidor arrancado desde `dist/main.js` con las
  rutas nuevas mapeadas (`payment-methods`, `companies/:id/payments`,
  `companies/:id/customers/:id/current-account`,
  `companies/:id/suppliers/:id/current-account`) y sin errores de
  resolución de dependencias cross-módulo (`treasury` inyectando
  `CustomerRepository`/`SupplierRepository`/`VoucherRepository` y
  `vouchers` inyectando de vuelta los dos nuevos servicios de cuenta
  corriente).
- ✅ Verificación end-to-end manual con `curl` contra `estrategos_dev`:
  Factura de Venta ($1210) sube el saldo del cliente, cobro parcial en
  efectivo ($500) lo baja a $710, cobro del resto combinando Transferencia
  + Cuenta Corriente lo lleva a $0 (con `balanceAfter` correcto en cada
  movimiento), Factura de Compra deja el saldo del proveedor en $-1000,
  pago al proveedor con un Cheque crea el `CheckDetail` enlazado con
  `status: EN_CARTERA`, y ambas reglas de sobre-imputación (RN-PAY-03 y
  RN-PAY-05) rechazan correctamente con 400.

### Desviaciones y hallazgos durante la implementación (no estaban en el plan original)

1. **Se eliminó `PaymentMethodAmountMismatchError` antes de escribir ningún
   test.** El diseño original (RN-PAY-02) contemplaba un error de
   "la suma de los medios no coincide con el monto total", asumiendo que
   `totalAmount` se informaba independientemente. Al implementar, se
   siguió el mismo principio que RN-VOU-09 (`Voucher.total` nunca se
   informa, se calcula): `Payment.totalAmount` se calcula sumando
   `PaymentMethodDetail.amount`, nunca se acepta como campo del request —
   por lo tanto el error de "no coincide" es lógicamente inalcanzable y se
   quitó del código antes de correr la suite, en vez de dejarlo como
   código muerto.
2. **Bug real detectado y corregido por la verificación e2e, no por los
   tests unitarios**: `PrismaPaymentRepository.create()` intentaba crear
   `PaymentMethodDetail` mezclando el FK escalar `paymentMethodId` con un
   `create` anidado por relación para `checkDetail`/`cardDetail` en el
   mismo objeto de escritura. Prisma exige que cada escritura anidada use
   un único estilo ("checked" —todo por relación— o "unchecked" —todo por
   FK escalar—); mezclarlos hace que Prisma interprete el objeto como
   "unchecked" y rechace `checkDetail`/`cardDetail` como argumentos
   desconocidos (`PrismaClientValidationError: Unknown argument
   'checkDetail'. Did you mean 'checkDetailId'?`). Los tests unitarios de
   `CreatePaymentUseCase` mockean el repositorio, así que no lo detectan
   — el bug solo se manifiesta contra Prisma real. Se corrigió creando
   `CheckDetail`/`CardDetail` en sentencias `create` separadas (cuando
   corresponde) y enlazando el resultado por `checkDetailId`/`cardDetailId`
   escalar, consistente con el estilo "unchecked" usado en el resto del
   código (`itemId`, `paymentMethodId`, etc.). Se agregó una prueba de
   integración dedicada (`RN-PAY-07: un pago con Cheque crea el
   CheckDetail...`) para que esta regresión no pueda reaparecer sin que
   la suite la detecte.
3. **Convención de signo verificada en la práctica, no solo en el papel**:
   la Nota de Crédito/reversión de Sprint 3.3 y el nuevo efecto de cuenta
   corriente comparten el mismo principio (`affectsStock`/
   `affectsCurrentAccount` ya vienen resueltos en el catálogo sembrado, sin
   necesitar inversión en tiempo de ejecución) — confirmado con la Nota de
   Crédito de la prueba e2e de Sprint 3.3 y, en este sub-sprint, con el
   saldo del proveedor quedando en `-1000` (no `+1000`) tras una Factura de
   Compra, exactamente como predice §0.3.
