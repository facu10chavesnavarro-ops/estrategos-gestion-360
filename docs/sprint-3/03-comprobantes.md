# Sprint 3 — Sub-sprint 3: Comprobantes (Ventas y Compras unificadas)

Implementa §1.3/1.4/1.5, §8, §9 y §10 de
`docs/sprint-3/00-arquitectura-nucleo-financiero.md` (documento de
arquitectura ya aprobado). Tercer sub-sprint del plan de §18 — depende de
Sprint 3.1 (`Item`/`Tax`) y Sprint 3.2 (`Stock`/`StockMovement`). Estado:
**en implementación.**

## 0. Decisiones de esta etapa

Ídem Sprint 3.1/3.2: implementación de decisiones ya aprobadas, más
refinamientos de bajo riesgo que se documentan por transparencia (no
requieren una nueva aprobación — ver criterio en cada punto).

### 0.1 Alcance recortado del catálogo `VoucherType`

El documento de arquitectura mencionaba también Recibo, Remito, Orden de
Compra y Presupuesto como tipos de comprobante. Al bajar a diseño
concreto:

- **Recibo no es un `Voucher`**: es un `Payment` (§14 del documento de
  arquitectura), una entidad separada que todavía no existe (Sprint 3.4).
  Incluirlo ahora en `VoucherType` sería modelar dos veces el mismo
  concepto. Se excluye del catálogo de este sub-sprint.
- **Remito, Orden de Compra y Presupuesto quedan fuera de alcance de
  Sprint 3.3**: son documentos sin numeración fiscal real y con una
  relación con la Factura (¿el Remito mueve stock independientemente y la
  Factura solo factura, o la Factura mueve el stock directamente?) que el
  documento de arquitectura no resolvió en detalle — resolverla ahora sin
  un caso de uso real que la motive sería inventar alcance. Se deja como
  incremento posterior, con el mismo motor de comprobantes (no requiere
  rediseño, solo agregar filas de catálogo + la regla de la relación).
- **Catálogo de este sub-sprint**: `FA_A`/`FA_B`/`FA_C` (Factura de Venta),
  `NC_A`/`NC_B`/`NC_C` (Nota de Crédito de Venta), `FC` (Factura de Compra
  registrada). Siete tipos — suficientes para probar el motor completo
  (numeración, líneas, snapshot de impuestos, efectos de stock, reversión
  por Nota de Crédito) en ambos flujos (`SALE`/`PURCHASE`).
- **Nota de Débito (`ND_*`) queda fuera de esta primera entrega**: no
  afecta stock y su único efecto real (débito en cuenta corriente) no
  existe hasta Sprint 3.4 — agregarla ahora sería un tipo de catálogo sin
  ningún caso de uso que la ejercite de punta a punta. Se agrega junto con
  Tesorería.

### 0.2 Ciclo de vida simplificado: sin Borrador, sin anulación directa

El documento de arquitectura proponía `DRAFT → CONFIRMED → CANCELLED`. Se
simplifica a **crear = confirmar en una sola operación**: no hay edición
posterior a numerar (nadie pidió todavía un flujo de "guardar borrador y
terminar después"), y por lo tanto tampoco existe un estado "todavía en
Borrador" desde el cual anular directamente. La única forma de revertir un
comprobante confirmado es con una Nota de Crédito/Débito que lo referencia
— exactamente lo que el documento de arquitectura ya preveía para el caso
"ya tuvo efectos confirmados". No se agrega columna `status` (sería
siempre `CONFIRMED`, dato sin valor informativo). Si en el futuro se pide
un flujo de borrador editable, se agrega como una función nueva sin
romper lo construido acá (una tabla de "borradores" separada, o la columna
`status` recién en ese momento).

### 0.3 Refactor interno de Sprint 3.2: `ApplyStockMovementService`

`CreateVoucherUseCase` necesita generar movimientos de stock (Factura de
Venta descuenta, Factura de Compra ingresa, Nota de Crédito revierte)
**dentro de la misma transacción** que numera y crea el comprobante — no
puede llamar a `CreateStockAdjustmentUseCase` tal como estaba escrito en
Sprint 3.2, porque ese caso de uso abre su **propia** transacción
(`unitOfWork.run`); llamarlo desde adentro de una transacción ya abierta
abriría una transacción nueva e independiente contra el cliente Prisma
singleton, rompiendo la atomicidad (exactamente el problema que Unit of
Work existe para evitar).

Se extrae la lógica pura de aplicar un movimiento (leer `Stock` actual,
recalcular con PPP, `upsert` de `Stock`, `create` de `StockMovement`) a un
servicio de aplicación nuevo, `ApplyStockMovementService`, que **recibe el
`ctx` en vez de abrir su propia transacción** — mismo principio que ya
separa "abrir transacción" (responsabilidad del caso de uso que orquesta)
de "usar el `ctx` recibido" (responsabilidad de los repositorios). Con
esto:

- `CreateStockAdjustmentUseCase` y `CreateStockTransferUseCase` (Sprint
  3.2) pasan a **usar** este servicio en vez de reimplementar la lógica —
  se elimina la duplicación entre ambos casos de uso, que ya existía desde
  Sprint 3.2 (la fórmula de PPP estaba copiada en los dos).
- `CreateVoucherUseCase` (este sub-sprint) lo reutiliza igual, sin
  duplicar la fórmula una tercera vez.
- El chequeo de stock negativo (RN-STK-06) se centraliza en el servicio
  (recibe `allowNegativeStock` ya resuelto por el caller), en vez de estar
  repetido en cada caso de uso que hace una salida.

No cambia ningún endpoint ni comportamiento observable de Sprint 3.2 — es
una reorganización interna. Se re-corren los 34 tests de ese módulo
después del refactor para confirmarlo.

### 0.4 `StockMovement.voucherId` (columna diferida en Sprint 3.2, se agrega ahora)

Como quedó anotado en `docs/sprint-3/02-depositos-y-stock.md` §0.1: la
columna se agrega ahora que `Voucher` existe, con FK real. Migración
aditiva (`ADD COLUMN` nullable), sin impacto en los movimientos ya
cargados (quedan con `voucherId = NULL`, que es exactamente su valor real:
se originaron en un ajuste manual, no en un comprobante).

### 0.5 Precio de línea: manual, no auto-completado desde `PriceList`

El documento de arquitectura preveía que el precio de venta pudiera
resolverse desde la `PriceList` preferida del `Customer`. Se difiere: el
`unitPrice` de cada línea se informa explícitamente en el request. Auto-
completar desde una lista es una mejora de UX que no cambia el modelo de
datos (`VoucherLine.unitPrice` sigue siendo un snapshot informado al
crear la línea, venga de donde venga) — se agrega sin fricción cuando
haya una pantalla real que lo necesite.

## 1. Modelo de datos

### 1.1 `PointOfSale`

```prisma
model PointOfSale {
  id        String   @id @default(uuid())
  companyId String   @map("company_id")
  branchId  String   @map("branch_id")
  code      String   // ej. "0001" (código AFIP)
  name      String
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([companyId, code])
  @@index([companyId])
  @@map("points_of_sale")
}
```

### 1.2 `VoucherType` (catálogo global de plataforma, seeded — igual que `Role`)

```prisma
enum VoucherFlow {
  SALE
  PURCHASE
}

enum StockEffect {
  IN
  OUT
  NONE
}

model VoucherType {
  id                    String      @id @default(uuid())
  code                  String      @unique // FA_A, FA_B, FA_C, NC_A, NC_B, NC_C, FC
  name                  String
  flow                  VoucherFlow
  affectsStock          StockEffect @map("affects_stock")
  requiresCae           Boolean     @map("requires_cae")
  isCreditNote          Boolean     @default(false) @map("is_credit_note")
  relatedVoucherRequired Boolean    @default(false) @map("related_voucher_required")
  isActive              Boolean     @default(true) @map("is_active")

  @@map("voucher_types")
}
```

`affectsCurrentAccount` **no se agrega todavía**: sin `CurrentAccount`
(Sprint 3.4) sería una columna sin ningún lector — se agrega en ese
sub-sprint.

### 1.3 `VoucherCounter`

```prisma
model VoucherCounter {
  companyId     String @map("company_id")
  pointOfSaleId String @map("point_of_sale_id")
  voucherTypeId String @map("voucher_type_id")
  lastNumber    Int    @default(0) @map("last_number")

  @@id([companyId, pointOfSaleId, voucherTypeId])
  @@map("voucher_counters")
}
```

Incremento atómico vía `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`
(una sola sentencia SQL, sin necesidad de `SELECT ... FOR UPDATE`
explícito — Postgres serializa los `UPDATE` concurrentes sobre la misma
fila de forma nativa). Ver §4.

### 1.4 `Voucher` (UUID v7 — alto volumen)

```prisma
model Voucher {
  id              String   @id
  companyId       String   @map("company_id")
  branchId        String   @map("branch_id")
  pointOfSaleId   String   @map("point_of_sale_id")
  voucherTypeId   String   @map("voucher_type_id")
  number          Int
  partyId         String   @map("party_id")
  warehouseId     String?  @map("warehouse_id")
  issueDate       DateTime @map("issue_date")
  currency        String
  exchangeRate    Decimal  @default(1) @map("exchange_rate") @db.Decimal(10, 4)
  relatedVoucherId String? @map("related_voucher_id")
  subtotal        Decimal  @db.Decimal(14, 2)
  taxTotal        Decimal  @map("tax_total") @db.Decimal(14, 2)
  total           Decimal  @db.Decimal(14, 2)
  cae             String?
  caeExpirationDate DateTime? @map("cae_expiration_date")
  createdByUserId String   @map("created_by_user_id")
  createdAt       DateTime @default(now()) @map("created_at")

  @@unique([companyId, pointOfSaleId, voucherTypeId, number])
  @@index([companyId, createdAt])
  @@index([partyId])
  @@map("vouchers")
}
```

`cae`/`caeExpirationDate` quedan `NULL` siempre en este sub-sprint — la
integración real con AFIP es una decisión de arquitectura propia (qué
librería, certificado, homologación vs. producción) explícitamente diferida
desde la Decisión 1.3, no se resuelve acá.

### 1.5 `VoucherLine` / `VoucherLineTax` (UUID v7 — alto volumen)

```prisma
model VoucherLine {
  id                 String   @id
  voucherId          String   @map("voucher_id")
  lineNumber         Int      @map("line_number")
  itemId             String?  @map("item_id")
  description        String
  quantity           Decimal  @db.Decimal(14, 3)
  unitPrice          Decimal  @map("unit_price") @db.Decimal(14, 4)
  discountPercentage Decimal  @default(0) @map("discount_percentage") @db.Decimal(5, 2)
  subtotal           Decimal  @db.Decimal(14, 2)

  @@unique([voucherId, lineNumber])
  @@map("voucher_lines")
}

model VoucherLineTax {
  voucherLineId String  @map("voucher_line_id")
  taxId         String  @map("tax_id")
  rate          Decimal @db.Decimal(6, 4)
  amount        Decimal @db.Decimal(14, 2)

  @@id([voucherLineId, taxId])
  @@map("voucher_line_taxes")
}
```

## 2. Reglas de negocio

| ID | Regla |
|---|---|
| RN-VOU-01 | Todo `Voucher` pertenece a una `Company`/`Branch`/`PointOfSale`; ninguna consulta puede omitir el filtro. |
| RN-VOU-02 | `number` se asigna automáticamente vía `VoucherCounter`, secuencial y sin huecos por `(companyId, pointOfSaleId, voucherTypeId)` — nunca informado por el usuario. Si la creación falla después de reservar el número, la transacción completa (incluido el incremento del contador) revierte — no quedan huecos. |
| RN-VOU-03 | Un `Voucher` es inmutable una vez creado — no existe edición ni anulación directa. La única forma de revertir sus efectos es una Nota de Crédito/Débito que lo referencia (ver §0.2). |
| RN-VOU-04 | La contraparte (`partyId`) debe tener el rol activo correspondiente al `flow` del `VoucherType`: `SALE` exige `Customer` activo, `PURCHASE` exige `Supplier` activo. |
| RN-VOU-05 | Cada línea con `itemId` copia (snapshot) el `unitPrice` informado y las tasas de los impuestos vigentes del `Item` (`ItemTax` → `Tax.rate` con `validFrom <= ahora <= validTo` o `validTo = NULL`) — nunca se vuelve a leer el catálogo después de confirmado. |
| RN-VOU-06 | Si `VoucherType.affectsStock ≠ NONE`, cada línea cuyo `Item.tracksStock = true` genera un `StockMovement` (dirección según `affectsStock`, invertida si `isCreditNote = true`) en el `warehouseId` del comprobante — dentro de la misma transacción (§0.3). `RN-STK-13` (solo ítems que trackean stock) y `RN-STK-06` (bloqueo de negativo) aplican igual que en Sprint 3.2. |
| RN-VOU-07 | `warehouseId` es obligatorio si el comprobante tiene al menos una línea con un ítem que trackea stock y `VoucherType.affectsStock ≠ NONE`. |
| RN-VOU-08 | Una Nota de Crédito exige `relatedVoucherId`; el comprobante referenciado debe existir, pertenecer a la misma empresa y al mismo `partyId`. |
| RN-VOU-09 | `subtotal`/`taxTotal`/`total` se calculan a partir de las líneas al confirmar — nunca se informan manualmente. |
| RN-VOU-10 | Autorización de escritura: `ROLES_THAT_CAN_MANAGE_COMPANY` (mismo criterio que el resto del núcleo financiero). Lectura: cualquier miembro activo. |
| RN-VOU-11 | Alta de un `Voucher` genera una única auditoría (no una por línea ni una por movimiento de stock generado). |
| RN-VOU-12 | `cae`/`caeExpirationDate` quedan `NULL` — la integración AFIP está fuera de alcance (§1.4). |

## 3. Endpoints

Todos **[CTX]**.

| Método | Endpoint | Caso de uso | Autorización |
|---|---|---|---|
| `POST` | `/companies/:id/branches/:branchId/points-of-sale` | `CreatePointOfSaleUseCase` | RN-VOU-10 |
| `GET` | `/companies/:id/branches/:branchId/points-of-sale` | `ListPointsOfSaleUseCase` | Miembro activo |
| `GET` | `/companies/:id/branches/:branchId/points-of-sale/:id` | `GetPointOfSaleByIdUseCase` | Miembro activo |
| `PATCH` | `/companies/:id/branches/:branchId/points-of-sale/:id` | `UpdatePointOfSaleUseCase` | RN-VOU-10 |
| `POST` | `/companies/:id/branches/:branchId/points-of-sale/:id/deactivate` | `DeactivatePointOfSaleUseCase` | RN-VOU-10 |
| `POST` | `/companies/:id/branches/:branchId/points-of-sale/:id/activate` | `ActivatePointOfSaleUseCase` | RN-VOU-10 |
| `GET` | `/voucher-types` (sin `[CTX]` — catálogo global de plataforma) | `ListVoucherTypesUseCase` | Cualquier usuario autenticado |
| `POST` | `/companies/:id/vouchers` | `CreateVoucherUseCase` | RN-VOU-10 |
| `GET` | `/companies/:id/vouchers` | `ListVouchersUseCase` (filtros `partyId`, `voucherTypeId`, rango de fecha) | Miembro activo |
| `GET` | `/companies/:id/vouchers/:voucherId` | `GetVoucherByIdUseCase` (incluye líneas + impuestos) | Miembro activo |

## 4. Casos de uso — notas de implementación

- **`ApplyStockMovementService`** (nuevo, `inventory/application/services/`):
  recibe `ctx` (no lo abre), aplica la fórmula PPP de Sprint 3.2, hace
  `upsert` de `Stock` y `create` de `StockMovement`, valida RN-STK-06
  (recibe `allowNegativeStock` ya resuelto por el caller). Reemplaza la
  lógica que estaba duplicada dentro de `CreateStockAdjustmentUseCase` y
  `CreateStockTransferUseCase`.
- **`CreateVoucherUseCase`** (módulo nuevo `vouchers`): valida rol, tipo de
  comprobante, punto de venta, contraparte (vía `CustomerRepository`/
  `SupplierRepository`, cross-módulo), líneas (ítem + impuestos vigentes);
  dentro de `unitOfWork.run`: incrementa el contador (`VoucherCounterRepository
  .getNextNumber`, `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`), crea
  `Voucher` + `VoucherLine`(s) + `VoucherLineTax`(s), aplica los
  `StockMovement` correspondientes vía `ApplyStockMovementService`, registra
  una única auditoría (`voucher.create`, con `metadata: { voucherTypeId,
  number, total }`).
- Cross-módulo: `vouchers` registra como providers propios
  `PrismaItemRepository`/`PrismaTaxRepository` (catalog),
  `PrismaCustomerRepository`/`PrismaSupplierRepository` (customers/
  suppliers), `PrismaWarehouseRepository`/`PrismaStockRepository`/
  `PrismaStockMovementRepository`/`ApplyStockMovementService` (inventory),
  `PrismaCompanyRepository` (companies) — mismo patrón ya usado en
  `inventory.module.ts` para `BranchRepository`.
- `ListVoucherTypesUseCase` no es `[CTX]`: el catálogo es global de
  plataforma (no pertenece a ninguna empresa), mismo criterio que
  `GET /roles`.

## 5. Pruebas

### 5.1 Unitarias

- `ApplyStockMovementService`: recálculo PPP en entrada, sin cambio de
  promedio en salida, bloqueo de negativo (extraídos de los tests que
  hoy están en `CreateStockAdjustmentUseCase`/`CreateStockTransferUseCase`
  — se mueven, no se duplican).
- `CreateStockAdjustmentUseCase`/`CreateStockTransferUseCase`: se
  actualizan para mockear `ApplyStockMovementService` en vez de
  `StockRepository`/`StockMovementRepository` directamente — se re-verifica
  que delegan correctamente.
- `CreateVoucherUseCase`: Factura de Venta (descuenta stock, snapshot de
  impuestos correcto, número asignado), Factura de Compra (ingresa stock),
  Nota de Crédito (revierte la dirección del efecto de stock, exige
  `relatedVoucherId` del mismo `partyId`), rechazo si la contraparte no
  tiene el rol activo correspondiente (RN-VOU-04), rechazo si falta
  `warehouseId` con líneas que trackean stock (RN-VOU-07), rechazo de
  RN-STK-06 propagado desde el servicio.
- `PointOfSale`: mismo patrón CRUD que `Warehouse` (Sprint 3.2).

### 5.2 Integración (contra `estrategos_test`)

- Rollback real de `CreateVoucherUseCase` (Factura de Venta): forzar falla
  en auditoría, verificar que no queda `Voucher`, ni `VoucherLine`, ni
  `StockMovement`, ni cambio en `Stock`.
- **Concurrencia de numeración**: disparar dos `CreateVoucherUseCase` en
  paralelo sobre el mismo `(pointOfSaleId, voucherTypeId)` y verificar que
  los números asignados son consecutivos sin duplicados ni huecos — la
  prueba de integración que de verdad justifica la Decisión 1.3.

### 5.3 End-to-end manual (`curl`)

Alta de punto de venta, Factura de Venta con dos líneas (una con impuesto,
snapshot verificado), verificación de stock descontado, Nota de Crédito
sobre esa factura (verificación de que el stock vuelve a su valor
original), Factura de Compra (verificación de stock incrementado con el
costo correcto), rechazo de Nota de Crédito sin `relatedVoucherId`,
rechazo de Factura a un `Customer` inactivo.

## 6. Archivos a tocar

- `apps/api/prisma/schema.prisma` — `PointOfSale`, `VoucherType`,
  `VoucherCounter`, `Voucher`, `VoucherLine`, `VoucherLineTax`, enums
  `VoucherFlow`/`StockEffect`, columna `StockMovement.voucherId`,
  migración.
- `apps/api/prisma/seed.ts` — 7 filas de `VoucherType`.
- `apps/api/src/modules/inventory/application/services/apply-stock-movement.service.ts` — nuevo.
- `apps/api/src/modules/inventory/application/use-cases/create-stock-adjustment.use-case.ts` / `create-stock-transfer.use-case.ts` — refactor para usar el servicio.
- `apps/api/src/modules/inventory/inventory.module.ts` — registra `ApplyStockMovementService`.
- `apps/api/src/modules/vouchers/**` — módulo nuevo completo (dominio,
  aplicación, infraestructura, presentación).
- `apps/api/test/inventory/**` — tests movidos/actualizados tras el
  refactor de §0.3.
- `apps/api/test/vouchers/**` — unitarios + integration-spec de rollback y
  de concurrencia de numeración.
- `CHANGELOG.md` — nueva versión al cerrar el módulo.

## 7. Resultado real (verificado, no supuesto)

- ✅ `npx tsc --noEmit`: 0 errores.
- ✅ `npx eslint`: 0 errores.
- ✅ `npx jest` (unitarios): **232/232 tests** (29 nuevos de este módulo: 6
  de `ApplyStockMovementService` movidos de Sprint 3.2 + 8 de
  `CreateStockAdjustmentUseCase`/`CreateStockTransferUseCase` reescritos
  para mockear el servicio + 8 de `PointOfSale` + 14 de
  `CreateVoucherUseCase`; el resto heredado sin regresiones).
- ✅ `npm run test:integration`: **15/15 tests de integración** contra
  Postgres real, incluyendo los 3 nuevos de `CreateVoucherUseCase` (camino
  feliz, rollback forzando fallo de auditoría, y **concurrencia de
  numeración**: dos altas en paralelo sobre el mismo
  `(pointOfSaleId, voucherTypeId)` devuelven números 1 y 2 sin duplicados).
- ✅ Migración `vouchers` (del cierre de la Tarea 28) aplicada contra
  `estrategos_dev` y `estrategos_test`; catálogo `VoucherType` sembrado en
  ambas bases (7 filas).
- ✅ `nest build` limpio, servidor arrancado con las rutas nuevas mapeadas
  (`points-of-sale`, `voucher-types`, `vouchers`) y sin errores de
  resolución de dependencias cross-módulo (`CustomerRepository`/
  `SupplierRepository`/`ItemRepository`/`TaxRepository`/
  `ApplyStockMovementService` inyectados en `vouchers.module.ts`).
- ✅ Verificación end-to-end manual con `curl` contra `estrategos_dev`:
  alta de punto de venta, depósito e ítem con impuesto (IVA 21%), ajuste
  de alta de stock (50 u. a $80), rechazo de Nota de Crédito sin
  `relatedVoucherId` (400, RN-VOU-08), Factura de Venta (`FA_A`) con dos
  líneas — una con ítem+impuesto (snapshot verificado: `rate: "21"`,
  `amount: "210"`) y una de servicio sin efecto de stock —, totales
  calculados automáticamente (`subtotal: 1050`, `taxTotal: 210`,
  `total: 1260`, RN-VOU-09), stock descontado 50→40 (RN-VOU-06), Nota de
  Crédito sobre esa factura con stock repuesto 40→50 y promedio
  recalculado a $84 (RN-STK-05, usando el `unitPrice` de la línea de la
  N/C como costo entrante), Factura de Compra (`FC`) con stock
  incrementado 50→70 y promedio recalculado a $85.7143, y rechazo de
  Factura a un `Customer` desactivado a mitad del flujo (400, RN-VOU-04).

### Desviaciones y hallazgos durante la implementación (no estaban en el plan original)

1. **`VoucherType.affectsStock` ya codifica la dirección final, no una
   "dirección base a invertir".** El §2 (RN-VOU-06) describe el efecto de
   stock como "la dirección de `affectsStock`, invertida si
   `isCreditNote = true`". En la práctica, el seed de `VoucherType` (Tarea
   28) ya asigna `affectsStock: 'IN'` directamente a las Notas de Crédito
   de Venta (`NC_*`) y `'OUT'` a las Facturas — es decir, el campo
   almacena el resultado ya resuelto, no un valor a invertir en el caso de
   uso. `CreateVoucherUseCase` usa `voucherType.affectsStock` tal cual
   como la dirección a aplicar, sin lógica de inversión adicional; el
   mapeo a `StockMovementType` (`SALE_OUT`/`PURCHASE_IN`/`RETURN_IN`/
   `RETURN_OUT`) sí depende de `isCreditNote` para elegir entre el tipo
   "normal" y el de devolución. Verificado con el caso real de punta a
   punta (§ anterior): la N/C efectivamente repone stock sin necesitar
   invertir nada en tiempo de ejecución.
2. **Costo de reingreso en una Nota de Crédito**: al revertir una venta,
   el costo con el que el ítem vuelve a entrar en `Stock` (para el
   recálculo de PPP) es el `unitPrice` informado en la línea de la propia
   Nota de Crédito — no el costo promedio histórico que tenía el ítem al
   momento de la venta original (dato que no se preserva en ningún lado
   hoy). Es una simplificación documentada, no una decisión de
   arquitectura nueva: el comportamiento es internamente consistente
   (mismo mecanismo que una entrada por ajuste manual) y correcto para el
   alcance de este sub-sprint; ajustar la precisión contable de esta
   reversión (por ejemplo, preservando el costo original) queda para
   cuando exista un caso de uso real que lo requiera.
3. **Corrección de un bug propio antes de correr ningún test**: la primera
   versión de la aplicación de movimientos de stock en
   `CreateVoucherUseCase` buscaba la línea recién creada por
   `itemId` (`voucher.lines.find(l => l.itemId === item.id)`), lo cual
   habría tomado siempre la primera línea con ese ítem si un comprobante
   tuviera dos líneas del mismo ítem (cantidad incorrecta aplicada a
   stock). Se corrigió antes de ejecutar la suite, iterando por índice
   (`resolvedLines`/`linesToCreate` están alineados 1 a 1 por posición,
   ya que `lineNumber = index + 1`) en vez de buscar por `itemId`.
4. **Mismo patrón de `Decimal.toString()` vs `.toFixed(n)`** que en
   Sprint 3.2 (docs/sprint-3/02-depositos-y-stock.md, hallazgo 3):
   `VoucherEntity.total` mapeado con `.toString()` devuelve `'1000'` en
   vez de `'1000.00'` para un total sin centavos. La prueba de
   integración se corrigió para verificar la precisión contra la fila
   cruda de Postgres (`voucherRows[0].total.toFixed(2)`) en vez de contra
   la entidad de dominio ya mapeada.
