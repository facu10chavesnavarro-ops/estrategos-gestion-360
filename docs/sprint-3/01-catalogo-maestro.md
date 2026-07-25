# Sprint 3 — Módulo 1: Catálogo maestro (Categorías, Ítems, Impuestos, Listas de precio)

Implementa §2-5 de `docs/sprint-3/00-arquitectura-nucleo-financiero.md` (documento
de arquitectura ya aprobado, incluida la Decisión 1.7). Primer sub-sprint del plan
de §18 de ese documento. Estado: **implementado y verificado. Ver §7 para el resultado real.**

## 0. Decisiones heredadas del documento de arquitectura (no se vuelven a discutir)

- `Item` es una entidad única con discriminador `type` (`PRODUCT`\|`SERVICE`), no
  tablas separadas (§2.2-B).
- `Category` es lista de adyacencia (`parentId` autoreferenciado), no niveles fijos
  (§3.2-A).
- `Tax` es un catálogo flexible con vigencia (`validFrom`/`validTo`), no una tasa
  fija en `Item` (§1.5-B). El snapshot en la línea de comprobante es de un módulo
  posterior (Sprint 3.3) — acá solo se construye el catálogo.
- Precio de lista es **neto**, sin impuestos incluidos (§5.2).
- IDs de este módulo: **UUID v4** — son catálogos de bajo volumen (§1.1), no
  aplica la evaluación de UUID v7 (reservada para `StockMovement`/`Voucher`/etc.).
- **Diferencia respecto de Sprint 1/2**: Unit of Work ya existe (no se agrega
  después, como pasó con Empresas/Clientes) — todo caso de uso de escritura de
  este módulo lo usa desde el día 1, porque toda escritura de catálogo +
  auditoría ya es multi-tabla por el criterio fijado en
  `docs/arquitectura/unit-of-work-y-transacciones.md`.

## 1. Modelo de datos

### 1.1 `Category`

```prisma
model Category {
  id        String   @id @default(uuid())
  companyId String   @map("company_id")
  parentId  String?  @map("parent_id")
  name      String
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  company  Company    @relation(fields: [companyId], references: [id])
  parent   Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children Category[] @relation("CategoryHierarchy")
  items    Item[]

  @@index([companyId])
  @@index([companyId, parentId])
  @@map("categories")
}
```

### 1.2 `Item` (Producto/Servicio unificado)

```prisma
enum ItemType {
  PRODUCT
  SERVICE
}

model Item {
  id              String   @id @default(uuid())
  companyId       String   @map("company_id")
  type            ItemType
  sku             String
  name            String
  description     String?
  categoryId      String?  @map("category_id")
  unitOfMeasure   String   @map("unit_of_measure")
  tracksStock     Boolean  @default(false) @map("tracks_stock")
  minimumStock    Decimal? @map("minimum_stock") @db.Decimal(14, 2)
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  company  Company    @relation(fields: [companyId], references: [id])
  category Category?  @relation(fields: [categoryId], references: [id])
  itemTaxes ItemTax[]
  priceListItems PriceListItem[]

  @@unique([companyId, sku])
  @@index([companyId])
  @@index([companyId, isActive])
  @@index([companyId, type])
  @@map("items")
}
```

### 1.3 `Tax`

```prisma
enum TaxType {
  VAT
  PERCEPTION
  WITHHOLDING
}

model Tax {
  id        String    @id @default(uuid())
  companyId String    @map("company_id")
  name      String
  type      TaxType
  rate      Decimal   @db.Decimal(6, 4)
  validFrom DateTime  @map("valid_from")
  validTo   DateTime? @map("valid_to")
  createdAt DateTime  @default(now()) @map("created_at")

  company   Company    @relation(fields: [companyId], references: [id])
  itemTaxes ItemTax[]

  @@index([companyId])
  @@map("taxes")
}
```

### 1.4 `ItemTax` (relación)

```prisma
model ItemTax {
  itemId String @map("item_id")
  taxId  String @map("tax_id")

  item Item @relation(fields: [itemId], references: [id])
  tax  Tax  @relation(fields: [taxId], references: [id])

  @@id([itemId, taxId])
  @@map("item_taxes")
}
```

### 1.5 `PriceList`

```prisma
model PriceList {
  id        String    @id @default(uuid())
  companyId String    @map("company_id")
  name      String
  currency  String
  isDefault Boolean   @default(false) @map("is_default")
  validFrom DateTime  @default(now()) @map("valid_from")
  validTo   DateTime? @map("valid_to")
  isActive  Boolean   @default(true) @map("is_active")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  company Company         @relation(fields: [companyId], references: [id])
  items   PriceListItem[]

  @@index([companyId])
  @@index([companyId, isActive])
  @@map("price_lists")
}
```

### 1.6 `PriceListItem`

```prisma
model PriceListItem {
  priceListId String   @map("price_list_id")
  itemId      String   @map("item_id")
  price       Decimal  @db.Decimal(14, 2)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  priceList PriceList @relation(fields: [priceListId], references: [id])
  item      Item      @relation(fields: [itemId], references: [id])

  @@id([priceListId, itemId])
  @@map("price_list_items")
}
```

**`Customer.preferredPriceListId`** (nullable, FK a `PriceList`): se agrega a la
tabla `customers` ya existente (Sprint 2) en la misma migración de este módulo —
es el único cambio a un modelo de un sprint anterior.

## 2. Reglas de negocio

| ID | Regla |
|---|---|
| RN-CAT-01 | Toda `Category`/`Item`/`Tax`/`PriceList` pertenece a una `Company`; ninguna consulta puede omitir `companyId` (heredado de RN-001/002). |
| RN-CAT-02 | `Category.parentId`, si se informa, debe referenciar una categoría **de la misma empresa**; se rechaza (400) si no. |
| RN-CAT-03 | No se permiten ciclos en la jerarquía de `Category` (una categoría no puede ser ancestro de sí misma). Se valida recorriendo la cadena de padres antes de aceptar un `parentId` nuevo. |
| RN-CAT-04 | Ninguna entidad de este módulo se elimina físicamente — se desactiva (`isActive=false`, o para `Tax`, cerrando su vigencia con `validTo`). Excepción explícita: **`PriceListItem` sí admite baja física** (RN-CAT-12) — no es un registro financiero, es solo la asociación "este ítem tiene este precio en esta lista"; el precio históricamente usado en una venta queda protegido aparte, como snapshot en la línea del comprobante (Sprint 3.3), no acá. |
| RN-CAT-05 | `Item.sku` es único por empresa. |
| RN-CAT-06 | `Item.type` es inmutable después de creado — no existe endpoint para convertir un Producto en Servicio ni viceversa (evita que código que asume "un ítem es siempre el mismo tipo" se rompa silenciosamente). |
| RN-CAT-07 | Si `Item.type = SERVICE`, `tracksStock` se fuerza a `false` en el servidor sin importar lo que envíe el request — un servicio nunca controla stock. |
| RN-CAT-08 | `Item.minimumStock` solo tiene efecto si `tracksStock = true`; si se informa con `tracksStock = false`, se rechaza (400) en vez de guardarse sin sentido. |
| RN-CAT-09 | `Tax.rate` debe ser `>= 0` — reforzado con `CHECK` de base de datos (mismo patrón que `customers.credit_limit`, Sprint 2/auditoría). |
| RN-CAT-10 | `Tax.validTo`, si se informa, debe ser posterior a `validFrom`. "Cerrar" un impuesto (dejar de estar vigente) es fijar `validTo = ahora`, nunca desactivarlo por otro medio. |
| RN-CAT-11 | Un `Item` puede tener más de un `Tax` asociado simultáneamente (ej. IVA + Percepción IIBB) — `ItemTax` no tiene restricción de unicidad más allá de `(itemId, taxId)`. |
| RN-CAT-12 | `PriceListItem.price` debe ser `>= 0` — `CHECK` de base de datos. |
| RN-CAT-13 | Como máximo una `PriceList` activa por empresa puede tener `isDefault = true`. Al marcar una nueva como default, la anterior se desmarca automáticamente en la misma transacción. |
| RN-CAT-14 | Alta, edición, activación/desactivación de `Category`/`Item`/`Tax`/`PriceList`, y alta/baja de `PriceListItem`, generan auditoría (RN-009), atómica con la escritura vía Unit of Work. |
| RN-CAT-15 | Autorización de escritura: mismos roles que ya gestionan Empresas/Clientes/Proveedores (`ROLES_THAT_CAN_MANAGE_COMPANY` — Administrador Estrategos, Propietario, Administrador de empresa), reutilizado tal cual, sin catálogo de permisos nuevo. Lectura: cualquier miembro activo de la empresa. |
| RN-CAT-16 | Activar algo ya activo, o desactivar algo ya inactivo, es un error de validación (400) — mismo criterio que RN-EMP-06/RN-TER-04. |

## 3. Endpoints

Todos **[CTX]** (requieren `X-Company-Id` + `CompanyContextGuard`), salvo que se
indique lo contrario.

| Método | Endpoint | Caso de uso | Autorización |
|---|---|---|---|
| `POST` | `/companies/:id/categories` | `CreateCategoryUseCase` | RN-CAT-15 |
| `GET` | `/companies/:id/categories` | `ListCategoriesUseCase` | Miembro activo |
| `GET` | `/companies/:id/categories/:categoryId` | `GetCategoryByIdUseCase` | Miembro activo |
| `PATCH` | `/companies/:id/categories/:categoryId` | `UpdateCategoryUseCase` | RN-CAT-15 |
| `POST` | `/companies/:id/categories/:categoryId/deactivate` | `DeactivateCategoryUseCase` | RN-CAT-15 |
| `POST` | `/companies/:id/categories/:categoryId/activate` | `ActivateCategoryUseCase` | RN-CAT-15 |
| `POST` | `/companies/:id/items` | `CreateItemUseCase` | RN-CAT-15 |
| `GET` | `/companies/:id/items` | `ListItemsUseCase` (filtros: `type`, `categoryId`, `isActive`, `search`) | Miembro activo |
| `GET` | `/companies/:id/items/:itemId` | `GetItemByIdUseCase` | Miembro activo |
| `PATCH` | `/companies/:id/items/:itemId` | `UpdateItemUseCase` | RN-CAT-15 |
| `POST` | `/companies/:id/items/:itemId/deactivate` | `DeactivateItemUseCase` | RN-CAT-15 |
| `POST` | `/companies/:id/items/:itemId/activate` | `ActivateItemUseCase` | RN-CAT-15 |
| `POST` | `/companies/:id/taxes` | `CreateTaxUseCase` | RN-CAT-15 |
| `GET` | `/companies/:id/taxes` | `ListTaxesUseCase` | Miembro activo |
| `PATCH` | `/companies/:id/taxes/:taxId` | `UpdateTaxUseCase` (solo `name`; `rate`/`validFrom` inmutables una vez creado — cambiar la tasa es cerrar este `Tax` y crear uno nuevo, para no reescribir historia) | RN-CAT-15 |
| `POST` | `/companies/:id/taxes/:taxId/close` | `CloseTaxUseCase` (fija `validTo`) | RN-CAT-15 |
| `POST` | `/companies/:id/price-lists` | `CreatePriceListUseCase` | RN-CAT-15 |
| `GET` | `/companies/:id/price-lists` | `ListPriceListsUseCase` | Miembro activo |
| `PATCH` | `/companies/:id/price-lists/:priceListId` | `UpdatePriceListUseCase` | RN-CAT-15 |
| `POST` | `/companies/:id/price-lists/:priceListId/deactivate` | `DeactivatePriceListUseCase` | RN-CAT-15 |
| `POST` | `/companies/:id/price-lists/:priceListId/activate` | `ActivatePriceListUseCase` | RN-CAT-15 |
| `GET` | `/companies/:id/price-lists/:priceListId/items` | `ListPriceListItemsUseCase` | Miembro activo |
| `PUT` | `/companies/:id/price-lists/:priceListId/items/:itemId` | `SetPriceListItemUseCase` (upsert del precio) | RN-CAT-15 |
| `DELETE` | `/companies/:id/price-lists/:priceListId/items/:itemId` | `RemovePriceListItemUseCase` | RN-CAT-15 |

`ItemTax` no tiene endpoints propios: se gestiona como parte del payload de
`CreateItemUseCase`/`UpdateItemUseCase` (`taxIds: string[]`) — reemplazo completo
del conjunto en cada escritura, dentro de la misma transacción que el `Item`.

## 4. Casos de uso — notas de implementación

- Todos los casos de uso de escritura reciben `UnitOfWork` por constructor y
  envuelven su lógica en `unitOfWork.run(async (ctx) => { ... })`, pasando `ctx`
  a cada repositorio — mismo patrón ya aplicado a Empresas/Clientes/Proveedores/
  Auth en la refactorización de Unit of Work.
- `CreateItemUseCase`/`UpdateItemUseCase`: dentro de la transacción, primero
  crea/actualiza `Item`, después reemplaza `ItemTax` (borra las filas existentes
  del ítem y crea las nuevas a partir de `taxIds`), después registra auditoría.
- `SetPriceListItemUseCase`: upsert de `PriceListItem` (crea si no existe,
  actualiza `price` si ya existe) + auditoría, en una transacción.
- `CreatePriceListUseCase`/`UpdatePriceListUseCase` con `isDefault: true`:
  dentro de la misma transacción, primero desmarca cualquier otra `PriceList`
  de la empresa que tuviera `isDefault = true` (RN-CAT-13), después aplica el
  cambio.
- `UpdateCategoryUseCase`: si cambia `parentId`, valida RN-CAT-02/03 (misma
  empresa, sin ciclos) antes de escribir.

## 5. Pruebas

### 5.1 Unitarias

Mismo patrón que el resto del proyecto: repos/puertos mockeados,
`UnitOfWork.run` mockeado como `(fn) => fn(fakeCtx)` (helper
`test/support/fake-unit-of-work.ts` ya existente, reutilizado).

Cobertura mínima por entidad (Category/Item/Tax/PriceList): alta autorizada,
alta rechazada por rol, edición, activar/desactivar con las reglas RN-CAT-16,
y las reglas específicas de cada una (RN-CAT-02/03 para Category, RN-CAT-06/07/
08 para Item, RN-CAT-09/10 para Tax, RN-CAT-13 para PriceList).

### 5.2 Integración (contra `estrategos_test`, infraestructura ya existente)

- Rollback real de `CreateItemUseCase` (Item + ItemTax + AuditLog): forzar falla
  en auditoría, verificar que no queda `Item` ni `ItemTax` huérfanos — mismo
  patrón que `create-company.integration-spec.ts`/`create-customer.integration-spec.ts`.
- Rollback real de `CreatePriceListUseCase` con `isDefault: true` cuando ya
  existía una default: verificar que si falla a mitad de camino, ninguna de las
  dos `PriceList` queda en un estado inconsistente (ni las dos default, ni
  ninguna).

### 5.3 End-to-end manual (`curl`, contra Postgres real)

Alta/edición/activación/desactivación de cada entidad; alta de Item con
`taxIds`; verificación de que un Servicio no puede tener `tracksStock: true`;
verificación de ciclo rechazado en Category; verificación de que solo una
PriceList queda `isDefault` tras crear una segunda con ese flag.

## 6. Archivos a tocar

- `apps/api/prisma/schema.prisma` — 6 modelos nuevos + enum `ItemType`/`TaxType`
  + columna `preferredPriceListId` en `Customer` + migración.
- `apps/api/src/modules/catalog/domain/**` — entidades, interfaces de
  repositorio (con `ctx?: TransactionContext` desde el día 1), errores de
  dominio.
- `apps/api/src/modules/catalog/application/**` — ~24 casos de uso, DTOs.
- `apps/api/src/modules/catalog/infrastructure/persistence/**` — repositorios
  Prisma.
- `apps/api/src/modules/catalog/presentation/**` — controllers, `@ApiTags`.
- `apps/api/src/modules/catalog/catalog.module.ts` — registro, incluyendo
  `{ provide: UnitOfWork, useClass: PrismaUnitOfWork }`.
- `apps/api/test/catalog/**` — unitarios + 2 integration-spec de rollback.
- `CHANGELOG.md` — nueva versión al cerrar el módulo.

## 7. Resultado real (verificado, no supuesto)

- ✅ `npx tsc --noEmit`: 0 errores.
- ✅ `npm run lint`: 0 errores.
- ✅ `npm test`: **169/169 tests unitarios** (57 nuevos del módulo + los 112
  heredados de Sprints 0/1/2 y de la infraestructura de Unit of Work, que
  siguen pasando).
- ✅ `npm run test:integration`: **8/8 tests de integración** contra Postgres
  real (`estrategos_test`), incluyendo los 2 nuevos de rollback de este
  módulo (`CreateItemUseCase` con `Item`+`ItemTax`+`AuditLog`;
  `CreatePriceListUseCase` con `isDefault` y `clearDefaultForCompany`+
  `AuditLog`).
- ✅ Migración `catalog_master_data` aplicada contra `estrategos_dev` y
  `estrategos_test`, con los 4 `CHECK` constraints (`minimum_stock >= 0`,
  `rate >= 0`, `valid_to > valid_from`, `price >= 0`) agregados a mano sobre
  la migración generada por Prisma.
- ✅ `nest build` limpio, servidor arrancado desde `dist/main.js` sin errores
  de resolución de dependencias (todas las inyecciones de `UnitOfWork` en
  `CatalogModule` resueltas correctamente).
- ✅ Verificación end-to-end manual con `curl` contra el servidor compilado:
  alta de Categoría, alta de Impuesto, alta de Ítem (Producto) con
  `categoryId`+`taxIds`, alta de Ítem (Servicio) confirmando que
  `tracksStock` se fuerza a `false` aunque el request envíe `true`
  (RN-CAT-07), SKU duplicado rechazado con 400 (RN-CAT-05), alta de Lista de
  precios con `isDefault: true`, fijar precio de un Ítem en la lista,
  listar precios de la lista, desactivar un Ítem (200) y volver a
  desactivarlo (400 — RN-CAT-16), y alta de una segunda Lista de precios
  `isDefault: true` confirmando que la primera se desmarca automáticamente
  (RN-CAT-13, verificado listando ambas listas y viendo que solo una tiene
  `isDefault: true`).

### Desviaciones respecto del plan original

Ninguna de fondo. Dos ajustes menores encontrados durante los tests de
integración (no durante el diseño): los fixtures de
`create-item.integration-spec.ts` y `create-price-list.integration-spec.ts`
inicialmente usaban un `requestingUserId` de string libre (`'user-1'`) que no
existía como fila real de `User` — `AuditLog.userId` tiene FK contra `users`,
así que la prueba de "camino feliz" (con auditoría real, no mockeada) fallaba
por violación de integridad referencial. Corregido creando un `User` real en
cada fixture, mismo patrón ya usado en
`create-customer.integration-spec.ts`.
