# Sprint 3 — Sub-sprint 2: Depósitos y Stock (Warehouse, Stock, StockMovement)

Implementa §6-7 de `docs/sprint-3/00-arquitectura-nucleo-financiero.md`
(documento de arquitectura ya aprobado). Segundo sub-sprint del plan de §18
de ese documento — depende de Sprint 3.1 (Catálogo maestro) para `Item`.
Estado: **implementado y verificado. Ver §7 para el resultado real.**

## 0. Decisiones de esta etapa (implementación de decisiones ya aprobadas, o de bajo riesgo — no requieren una nueva aprobación, se documentan por transparencia)

### 0.1 Alcance: sin comprobantes todavía

Como ya fijó §18 del documento de arquitectura: en este sub-sprint **no
existen** `Voucher` ni `Sale`/`Purchase` — esos llegan en Sprint 3.3. Por lo
tanto `StockMovement` en esta etapa solo se origina de dos formas: **ajuste
manual** (alta/baja de stock con motivo) y **transferencia entre
depósitos**. Los tipos `PURCHASE_IN`/`SALE_OUT`/`RETURN_IN`/`RETURN_OUT` del
enum se declaran ahora (para no tener que migrar el enum de Postgres otra
vez en Sprint 3.3 — `ALTER TYPE ... ADD VALUE` es viable pero se evita si no
hace falta), pero ningún caso de uso de este sub-sprint los genera. La
columna `voucherId` que el documento de arquitectura mencionaba **no se
agrega todavía**: sin tabla `Voucher`, sería una columna sin ningún caso de
uso real que la llene ni ninguna FK que la valide — se agrega en Sprint 3.3
junto con `Voucher` (una migración `ADD COLUMN` simple, sin impacto en los
datos ya cargados).

### 0.2 Warehouse no se crea automáticamente al crear una Sucursal

El documento de arquitectura sugería (§6.2) que cada empresa nueva arranque
con un depósito "Principal" creado junto a su primera sucursal. Al bajar
esto a diseño concreto, se revisa esa sugerencia: acoplar la creación
automática de un `Warehouse` a `CreateBranchUseCase` (módulo `companies`)
haría que ese módulo dependa del módulo `inventory` (nuevo), rompiendo el
patrón de independencia entre módulos que el proyecto mantiene desde
Sprint 0 (ningún módulo hoy escribe en las tablas de otro dentro de su
propia transacción; los módulos que necesitan leer datos de otro —
`users`/`customers` leyendo `Company`/`CompanyUser` — lo hacen registrando
su propia instancia del repositorio Prisma correspondiente como provider,
nunca escribiendo). Mantener esa independencia es más valioso que el ahorro
de un clic, así que **la creación de `Warehouse` es siempre explícita**, vía
su propio endpoint — igual que hoy nadie crea automáticamente una `Branch`
al crear una `Company`. Cambio reversible y de bajo riesgo: si en el futuro
se decide automatizarlo, se agrega sin romper nada de lo construido acá.

### 0.3 Generación de UUID v7 sin dependencia nueva

La Decisión 1.1 (ya aprobada) exige UUID v7 para `StockMovement` (tabla de
alto volumen). Prisma 5.20 no lo genera nativamente (`@default(uuid())` es
v4), así que se genera en la capa de infraestructura. En vez de agregar una
librería nueva (`uuidv7` o similar) para una función de ~15 líneas bien
documentada en el RFC 9562, se implementa un generador propio
(`common/infrastructure/id/uuid-v7.ts`, sin dependencias, solo `crypto` de
Node) — consistente con el criterio general del proyecto de no sumar
dependencias sin necesidad real. `StockMovement.id` se declara `String @id`
**sin** `@default(...)`: Prisma exige que la aplicación lo provea siempre,
lo que hace imposible olvidarse de usar el generador correcto.

## 1. Modelo de datos

### 1.1 `Warehouse` (Depósito)

```prisma
model Warehouse {
  id        String   @id @default(uuid())
  companyId String   @map("company_id")
  branchId  String   @map("branch_id")
  name      String
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  company Company @relation(fields: [companyId], references: [id])
  branch  Branch  @relation(fields: [branchId], references: [id])
  stocks  Stock[]

  @@unique([branchId, name])
  @@index([companyId])
  @@map("warehouses")
}
```

`companyId` duplicado respecto de `branch.companyId` — mismo criterio ya
aplicado a `Customer`/`Supplier`/`Party` desde Sprint 2 (columna directa
indexada en cada tabla operativa, nunca se edita independientemente).

### 1.2 `Stock`

```prisma
model Stock {
  companyId    String   @map("company_id")
  itemId       String   @map("item_id")
  warehouseId  String   @map("warehouse_id")
  quantity     Decimal  @default(0) @db.Decimal(14, 3)
  averageCost  Decimal  @default(0) @map("average_cost") @db.Decimal(14, 4)
  updatedAt    DateTime @updatedAt @map("updated_at")

  item      Item      @relation(fields: [itemId], references: [id])
  warehouse Warehouse @relation(fields: [warehouseId], references: [id])

  @@id([itemId, warehouseId])
  @@index([companyId])
  @@map("stock")
}
```

`quantity` con 3 decimales (no 2): permite ítems que se miden por fracción
(kg, litros) sin redondeo prematuro — más precisión que los montos
monetarios, que se quedan en 2.

### 1.3 `StockMovement`

```prisma
enum StockMovementType {
  PURCHASE_IN
  SALE_OUT
  ADJUSTMENT_IN
  ADJUSTMENT_OUT
  TRANSFER_IN
  TRANSFER_OUT
  RETURN_IN
  RETURN_OUT
}

model StockMovement {
  id              String            @id
  companyId       String            @map("company_id")
  itemId          String            @map("item_id")
  warehouseId     String            @map("warehouse_id")
  type            StockMovementType
  quantity        Decimal           @db.Decimal(14, 3)
  unitCost        Decimal           @map("unit_cost") @db.Decimal(14, 4)
  reason          String?
  transferGroupId String?           @map("transfer_group_id")
  userId          String            @map("user_id")
  createdAt       DateTime          @default(now()) @map("created_at")

  item      Item      @relation(fields: [itemId], references: [id])
  warehouse Warehouse @relation(fields: [warehouseId], references: [id])
  user      User      @relation(fields: [userId], references: [id])

  @@index([companyId, createdAt])
  @@index([itemId, warehouseId])
  @@index([transferGroupId])
  @@map("stock_movements")
}
```

`id` sin `@default`: ver §0.3. `quantity` siempre positivo — el signo lo da
`type` (regla de aplicación, no de base de datos, igual que documentó el
documento de arquitectura).

### 1.4 `Company.allowNegativeStock` (campo nuevo en tabla existente)

```prisma
allowNegativeStock Boolean @default(false) @map("allow_negative_stock")
```

RN-STK-06 (ver abajo): por defecto no se permite quedar en negativo;
configurable por empresa.

## 2. Reglas de negocio

| ID | Regla |
|---|---|
| RN-STK-01 | Todo `Warehouse` pertenece a una `Branch` (que a su vez pertenece a una `Company`); todo `Stock`/`StockMovement` pertenece a una `Company` — ninguna consulta puede omitir el filtro. |
| RN-STK-02 | `Warehouse.name` es único dentro de la misma `Branch`. |
| RN-STK-03 | Ningún `Warehouse` se elimina físicamente — se desactiva. `Stock`/`StockMovement` nunca se "eliminan": `Stock` se actualiza (nunca a mano, ver RN-STK-04) y `StockMovement` es un ledger append-only. |
| RN-STK-04 | `Stock` nunca se escribe directamente desde un caso de uso — solo cambia como efecto de un `StockMovement`, dentro de la misma transacción de Unit of Work que lo crea. No existe ningún `UpdateStockUseCase`. |
| RN-STK-05 | Costeo por Promedio Ponderado (PPP, ya decidido en §1.6). Una entrada (`ADJUSTMENT_IN`/`TRANSFER_IN`) recalcula `averageCost` con la fórmula `(cantidadActual × costoActual + cantidadEntrante × costoEntrante) / (cantidadActual + cantidadEntrante)`; una salida (`ADJUSTMENT_OUT`/`TRANSFER_OUT`) descuenta `quantity` pero **no** modifica `averageCost`. El `unitCost` de una salida es siempre el `averageCost` vigente en ese momento (snapshot, no un valor que el usuario ingresa) — el costo de lo que sale lo determina el promedio existente, no una entrada manual. |
| RN-STK-06 | No se permite que `Stock.quantity` quede negativo, salvo que `Company.allowNegativeStock = true`. |
| RN-STK-07 | Toda salida de stock (`ADJUSTMENT_OUT`/`TRANSFER_OUT`) exige `reason` (motivo) — en este sub-sprint no hay comprobante que lo explique. |
| RN-STK-08 | Una transferencia entre depósitos genera **dos** `StockMovement` (`TRANSFER_OUT` en origen + `TRANSFER_IN` en destino) con el mismo `transferGroupId`, creados atómicamente en la misma transacción. |
| RN-STK-09 | Los dos depósitos de una transferencia deben pertenecer a la misma empresa (pueden ser de sucursales distintas) y ser depósitos distintos entre sí. |
| RN-STK-10 | Alta/edición/activación/desactivación de `Warehouse`, y cada `StockMovement`, generan auditoría (RN-009), atómica vía Unit of Work. |
| RN-STK-11 | Autorización de escritura: mismos roles que gestionan el catálogo (`ROLES_THAT_CAN_MANAGE_COMPANY`). Lectura: cualquier miembro activo de la empresa. |
| RN-STK-12 | Activar/desactivar algo ya en ese estado es error de validación (400) — mismo criterio que RN-CAT-16/RN-EMP-06. |
| RN-STK-13 | Solo se puede registrar `StockMovement` sobre un `Item` con `tracksStock = true`. Todo Servicio (que siempre tiene `tracksStock = false`, RN-CAT-07) queda excluido por construcción. |

## 3. Endpoints

Todos **[CTX]**.

| Método | Endpoint | Caso de uso | Autorización |
|---|---|---|---|
| `POST` | `/companies/:id/branches/:branchId/warehouses` | `CreateWarehouseUseCase` | RN-STK-11 |
| `GET` | `/companies/:id/branches/:branchId/warehouses` | `ListWarehousesUseCase` | Miembro activo |
| `GET` | `/companies/:id/branches/:branchId/warehouses/:warehouseId` | `GetWarehouseByIdUseCase` | Miembro activo |
| `PATCH` | `/companies/:id/branches/:branchId/warehouses/:warehouseId` | `UpdateWarehouseUseCase` | RN-STK-11 |
| `POST` | `/companies/:id/branches/:branchId/warehouses/:warehouseId/deactivate` | `DeactivateWarehouseUseCase` | RN-STK-11 |
| `POST` | `/companies/:id/branches/:branchId/warehouses/:warehouseId/activate` | `ActivateWarehouseUseCase` | RN-STK-11 |
| `GET` | `/companies/:id/warehouses/:warehouseId/stock` | `ListStockUseCase` (filtro opcional `itemId`) | Miembro activo |
| `GET` | `/companies/:id/warehouses/:warehouseId/stock-movements` | `ListStockMovementsUseCase` (filtros `itemId`, `type`, rango de fecha) | Miembro activo |
| `POST` | `/companies/:id/warehouses/:warehouseId/stock-movements/adjustment` | `CreateStockAdjustmentUseCase` (`direction: 'IN'\|'OUT'`) | RN-STK-11 |
| `POST` | `/companies/:id/stock-transfers` | `CreateStockTransferUseCase` | RN-STK-11 |

`Stock` no tiene endpoint de escritura (RN-STK-04) — su único endpoint es de
lectura, y solo cambia como efecto de los dos endpoints de `StockMovement`.

## 4. Casos de uso — notas de implementación

- Los 10 casos de uso de escritura (`CreateWarehouseUseCase`,
  `UpdateWarehouseUseCase`, `Deactivate/ActivateWarehouseUseCase`,
  `CreateStockAdjustmentUseCase`, `CreateStockTransferUseCase`) usan
  `UnitOfWork` desde el día 1, mismo patrón que Sprint 3.1.
- `CreateWarehouseUseCase` valida que `branchId` exista y pertenezca a la
  `companyId` del contexto — vía `BranchRepository` importado del módulo
  `companies` (mismo patrón cross-módulo que ya usan `users`/`customers`
  para leer `Company`/`CompanyUser`: se registra `PrismaBranchRepository`
  como provider propio del módulo `inventory`, sin acoplar los módulos de
  Nest entre sí).
- `CreateStockAdjustmentUseCase`: valida `Item.tracksStock = true`
  (RN-STK-13); para `direction: 'IN'` exige `unitCost` en el body; para
  `direction: 'OUT'` ignora cualquier `unitCost` recibido y usa el
  `averageCost` vigente (RN-STK-05); valida RN-STK-06 antes de descontar;
  crea el `StockMovement` (`id` generado con `uuidv7()`) y actualiza `Stock`
  (upsert) dentro de la misma transacción; registra auditoría.
- `CreateStockTransferUseCase`: valida que origen y destino existan,
  pertenezcan a la misma empresa y sean distintos (RN-STK-09); valida
  RN-STK-13 sobre el ítem; valida RN-STK-06 sobre el origen; crea
  `TRANSFER_OUT` (origen) y `TRANSFER_IN` (destino) con el mismo
  `transferGroupId` (un UUID v4, generado una vez para agrupar el par);
  actualiza ambos `Stock` en la misma transacción; registra **una sola**
  auditoría con `metadata: { fromWarehouseId, toWarehouseId, transferGroupId }`
  (no dos, para no duplicar el registro de un mismo hecho de negocio).

## 5. Pruebas

### 5.1 Unitarias

Mismo patrón que Sprint 3.1: repos mockeados, `UnitOfWork.run` mockeado.
Cobertura mínima: alta/edición/activación/desactivación de `Warehouse`
(incluyendo nombre duplicado en la misma sucursal y `branchId` de otra
empresa); `CreateStockAdjustmentUseCase` (entrada recalculando
`averageCost`, salida sin modificarlo, RN-STK-06/07/13, y el caso borde de
primera entrada con `Stock` inexistente todavía — `quantity`/`averageCost`
parten de 0); `CreateStockTransferUseCase` (par `TRANSFER_OUT`/`TRANSFER_IN`
con el mismo `transferGroupId`, RN-STK-09, RN-STK-06 sobre el origen);
`uuidv7()` (formato válido — nibble de versión `7`, bits de variante
correctos — y orden temporal creciente entre llamadas sucesivas).

### 5.2 Integración (contra `estrategos_test`)

- Rollback real de `CreateStockAdjustmentUseCase`: forzar falla en
  auditoría, verificar que ni `StockMovement` ni el cambio en `Stock`
  quedan persistidos.
- Rollback real de `CreateStockTransferUseCase`: forzar falla a mitad de
  camino, verificar que **ninguno** de los dos `StockMovement` ni ninguno
  de los dos `Stock` quedan modificados (ni el de origen "ya descontado sin
  su par de destino").

### 5.3 End-to-end manual (`curl`)

Alta de depósito, ajuste de entrada (verificar `Stock` creado con la
cantidad y costo correctos), ajuste de entrada adicional (verificar
recálculo de `averageCost`), ajuste de salida (verificar que `averageCost`
no cambia), intento de salida que dejaría stock negativo sin
`allowNegativeStock` (esperar 400), transferencia entre dos depósitos
(verificar `Stock` en ambos lados y el par de movimientos con el mismo
`transferGroupId`), listado de movimientos (kardex) de un ítem/depósito.

## 6. Archivos a tocar

- `apps/api/prisma/schema.prisma` — `Warehouse`, `Stock`, `StockMovement`,
  enum `StockMovementType`, campo `Company.allowNegativeStock`, migración.
- `apps/api/src/common/infrastructure/id/uuid-v7.ts` — generador propio,
  sin dependencias nuevas.
- `apps/api/src/modules/inventory/**` — dominio, aplicación (10 casos de
  uso), infraestructura, presentación — mismo layout que `catalog`.
- `apps/api/src/modules/inventory/inventory.module.ts` — registro,
  incluyendo `PrismaBranchRepository` (cross-módulo, ver §0.2/§4) y
  `{ provide: UnitOfWork, useClass: PrismaUnitOfWork }`.
- `apps/api/test/inventory/**` — unitarios + 2 integration-spec de rollback.
- `CHANGELOG.md` — nueva versión al cerrar el módulo.

## 7. Resultado real (verificado, no supuesto)

- ✅ `npx tsc --noEmit`: 0 errores.
- ✅ `npm run lint`: 0 errores.
- ✅ `npm test`: **203/203 tests unitarios** (34 nuevos de este módulo + 169
  heredados).
- ✅ `npm run test:integration`: **12/12 tests de integración** contra
  Postgres real, incluyendo los 4 nuevos de rollback de este módulo
  (`CreateStockAdjustmentUseCase` camino feliz + rollback,
  `CreateStockTransferUseCase` camino feliz + rollback).
- ✅ Migración `warehouses_stock_movements` aplicada contra `estrategos_dev`
  y `estrategos_test`, con los 3 `CHECK` constraints agregados a mano
  (`stock.average_cost >= 0`, `stock_movements.quantity > 0`,
  `stock_movements.unit_cost >= 0`).
- ✅ `nest build` limpio, servidor arrancado desde `dist/main.js` con las 10
  rutas nuevas mapeadas y sin errores de resolución de dependencias
  (incluida la inyección cross-módulo de `BranchRepository`/`ItemRepository`/
  `CompanyRepository`).
- ✅ Verificación end-to-end manual con `curl`: alta de dos depósitos en la
  misma sucursal, alta de un ítem, ajuste de entrada (10 u. a $100),
  segunda entrada (10 u. a $200, promedio recalculado a $150 — verificado
  exacto), salida sin motivo rechazada (400, RN-STK-07), salida con motivo
  (5 u., promedio sin cambios, snapshot de costo = $150), intento de salida
  que dejaría stock negativo rechazado (400, RN-STK-06), transferencia de 5
  u. entre depósitos (par `TRANSFER_OUT`/`TRANSFER_IN` con el mismo
  `transferGroupId`, costo transferido = $150, stock correcto en ambos
  lados), y kardex (`GET .../stock-movements`) mostrando los 4 movimientos
  en orden — con los IDs (UUID v7) visiblemente ordenados temporalmente en
  la práctica.

### Desviaciones y hallazgos durante la implementación (no estaban en el plan original)

1. **Dependencia nueva: `decimal.js`.** El cálculo de costo promedio
   ponderado (RN-STK-05) es aritmética acumulativa (no una sola comparación
   de signo como el resto de los campos `Decimal` del sistema, que se
   validan con `Number()` sin problema) — hacerlo con `Number` de JavaScript
   reintroducía el riesgo de imprecisión de punto flotante que el proyecto
   evita deliberadamente en todo lo demás. Se agregó `decimal.js` (la misma
   librería que Prisma usa internamente para su propio tipo `Decimal`, pero
   no expuesta como dependencia resoluble por separado) como dependencia
   directa — pequeña, sin dependencias propias, ampliamente usada. Se
   evaluó hacerlo con aritmética de enteros escalados (`BigInt`) para no
   sumar una dependencia, pero se descartó por mayor superficie de error en
   código que calcula costos monetarios directamente.
2. **`CompanyEntity` ganó un campo** (`allowNegativeStock`, penúltimo
   parámetro del constructor) para exponer la nueva columna — se actualizó
   `CompanyMapper` y los 3 archivos de test que construían la entidad
   directamente (`company-management.use-cases.spec.ts`,
   `get-company-by-id.use-case.spec.ts`,
   `invitation.use-cases.spec.ts`), sin cambiar ningún comportamiento
   existente.
3. **Assertions de integración corregidas tras la primera corrida**: los
   tests de integración comparaban `Decimal.toString()` contra literales
   como `'10.000'`, pero `toString()` de `Prisma.Decimal` normaliza y quita
   ceros de más (devuelve `'10'`). Los valores calculados eran correctos —
   solo la comparación estaba mal formulada. Corregido usando
   `.toFixed(3)`/`.toFixed(4)`, que sí fuerzan la escala esperada.
