# Frontend Sprint F3 — Catálogo de Productos y Servicios

> Depende de `00-arquitectura-frontend.md`, `01-organizacion-y-estado.md`,
> `02-navegacion-y-ux.md`, `03-plan-de-implementacion.md` y de
> `docs/sprint-3/01-catalogo-maestro.md` (arquitectura del backend:
> modelo `Category`/`Item`/`Tax`/`PriceList`, RN-CAT-01 a 16). Releva el
> contrato real (entidades, controllers, DTOs, integración con
> `inventory`/`vouchers`) antes de escribir este documento, mismo
> criterio que F1/F2.

## 1. Alcance

El pedido original de este sprint (CRUD de Productos/Servicios,
categorías, subcategorías, unidades de medida, SKU, código de barras,
descripción corta/larga, costos, precio de venta, múltiples listas de
precio, IVA/impuestos, activo/inactivo, búsqueda rápida, filtros
avanzados, import/export CSV, integración con Stock/Comprobantes/
Tesorería/Contabilidad) se contrastó contra el contrato real del backend
(`docs/sprint-3/01-catalogo-maestro.md`) antes de programar. Tres puntos
requerían una decisión del usuario — **ya resueltos explícitamente**
antes de este documento:

1. **Campos faltantes en `Item`** (código de barras, costo, descripción
   larga): no existían en el backend. **Decisión: agregarlos ahora**
   (migración aditiva). Ver `CHANGELOG.md [1.2.0]` y el backend ya
   extendido/versionado.
2. **Import/export CSV de ítems**: no existía ninguno de los dos en el
   backend. **Decisión: implementar ambos ahora.** Ver `[1.2.0]`.
3. **"Integración completa con Stock y Comprobantes"**: Stock (F4) y
   Comprobantes (F5) son sprints propios del plan ya aprobado, sin
   pantallas todavía. **Decisión: el detalle de cada ítem muestra el
   stock actual** (compuesto contra endpoints de inventario ya
   existentes, sin construir pantallas de Stock ni de Comprobantes) —
   ver §3.5.

Alcance final de F3:

- **Categorías**: árbol jerárquico (auto-referencial, profundidad
  libre), alta/edición/activar-desactivar, mapeo contable opcional
  (visible, no obligatorio hasta F8).
- **Ítems (Productos y Servicios)**: alta/edición con tipo, SKU, código
  de barras, unidad de medida, descripción corta/larga, costo, categoría,
  impuestos asociados (multi-select), `tracksStock` forzado a `false`
  para Servicios (RN-CAT-07, decisión del backend, no configurable en la
  UI), stock mínimo condicional a `tracksStock`. Búsqueda rápida +
  filtros avanzados (tipo, categoría, estado). Import/export CSV.
- **Detalle de ítem**: datos completos + **stock actual por depósito**
  (solo si `tracksStock`), compuesto contra los endpoints ya existentes
  de `inventory` — ver §3.5.
- **Impuestos**: alta (tasa y vigencia inmutables, la UI lo comunica
  explícitamente), cierre de vigencia, mapeo contable opcional.
- **Listas de precio**: alta, gestión de precios por ítem dentro de una
  lista (tabla editable inline).
- **Entregable**: catálogo completo administrable. E2E: crear categoría
  → ítem con esa categoría e impuesto → agregarlo a una lista de
  precios; importar un CSV de ítems.

## 2. Relevamiento del contrato backend (resumen)

Ver `docs/sprint-3/01-catalogo-maestro.md` para el detalle completo.
Puntos clave para el frontend:

- **Autorización** (RN-CAT-15, mismo set que F1/F2):
  `ROLES_THAT_CAN_MANAGE_COMPANY` para mutaciones; lectura abierta a
  cualquier miembro — mismo patrón que Clientes/Proveedores en F2, no el
  de "Usuarios" en F1 (que ocultaba toda la sección).
- **`Item`** (ya con la extensión `[1.2.0]`): `id, companyId, type
  ('PRODUCT'|'SERVICE'), sku, name, description, longDescription,
  categoryId, unitOfMeasure, tracksStock, minimumStock, costPrice,
  barcode, isActive, taxIds[]`.
- **`Category`**: auto-referencial vía `parentId`; ciclos rechazados por
  el backend (RN-CAT-03) — la UI igual filtra la propia rama del árbol
  del selector de padre para no ofrecer una opción que el backend va a
  rechazar de todos modos (fail-closed en la UX, no solo del lado
  servidor).
- **`Tax`**: `rate`/`validFrom` inmutables tras crear — "editar" una tasa
  es cerrarla (`validTo`) y crear una nueva. La UI no ofrece un campo de
  edición de tasa, solo "Cerrar vigencia" + "+ Nuevo impuesto".
- **`PriceList`/`PriceListItem`**: precios netos de impuestos (sin
  IVA incluido); a lo sumo una lista `isDefault=true` por empresa
  (el backend desmarca la anterior automáticamente).
- **Import/export CSV de ítems** (`[1.2.0]`): mismo contrato que
  Clientes/Proveedores de F2 (`csvContent` como texto plano en JSON,
  `mode` con los mismos 3 valores). La exportación es `GET .../items/
  export` devolviendo `text/csv` directamente (no JSON) — el frontend la
  dispara como descarga de archivo, no como llamada de TanStack Query.
- **Gap de `shared-types`**: igual que F1/F2, las entidades de dominio
  llegan vacías en el OpenAPI generado — se definen a mano en
  `lib/api/catalog/*.ts`.

## 3. Decisiones técnicas de implementación

### 3.1 Un único módulo `lib/api/catalog/` con 4 archivos

A diferencia de Clientes/Proveedores (dos módulos de dominio separados
en el backend), Categorías/Ítems/Impuestos/Listas de precio son todas
parte del mismo módulo backend (`catalog`) y estarán siempre bajo el
mismo layout de navegación (tabs de una sola sección). Se organizan como
`lib/api/catalog/{categories,items,taxes,price-lists}.ts` — carpeta
propia en vez de archivos sueltos en `lib/api/` porque son 4 archivos
relacionados (a diferencia de `customers.ts`/`suppliers.ts` en F2, que
son independientes entre sí).

### 3.2 Layout con tabs, igual que Configuración (F1)

`catalogo/layout.tsx` con tabs `Productos | Servicios | Categorías |
Impuestos | Listas de precio` — mismo patrón que F1 (`ConfiguracionLayout`
con tabs `Empresa | Usuarios`), no el patrón de F2 (dos rutas de nivel
superior independientes) porque acá las 5 pantallas comparten
completamente su navegación y ninguna tiene sentido como ítem de sidebar
propio (el plan ya define un solo ítem "Catálogo").

**Productos y Servicios son la misma pantalla filtrada por `type`**, no
dos componentes separados: mismo listado (`ItemsTable`), mismo `Sheet`
de alta/edición (`ItemSheet`) con el campo `type` fijo según la tab activa
al crear (no editable después, RN-CAT-06) — evita duplicar ~90% de un
componente idéntico salvo el filtro inicial, mismo criterio de
"componentes concretos, no genéricos-por-las-dudas" que F1/F2.

### 3.3 Árbol de categorías: componente recursivo simple

`CategoryTree` es un componente que se renderiza a sí mismo por cada
`children` (no una librería de árbol de terceros — la profundidad típica
de un plan de cuentas o categorías de productos es baja, un componente
recursivo de ~40 líneas alcanza). Cada nodo: nombre, badge de estado,
acciones (editar/activar-desactivar), botón "+ Subcategoría" que abre el
mismo `Sheet` de alta con `parentId` precargado. El selector de padre en
el `Sheet` excluye la propia rama (el nodo que se edita + todos sus
descendientes) para no ofrecer una opción que el backend rechazaría por
ciclo (RN-CAT-03) — validación en el cliente por UX, la autoridad real
sigue siendo el backend.

### 3.4 Impuestos: "editar" es cerrar + crear

Sin campo de edición de `rate`/`validFrom` en el `Sheet` (son inmutables,
RN-CAT-10). El listado muestra tasa, vigencia y estado; la acción sobre
un impuesto vigente es "Cerrar vigencia" (`ConfirmDialog` simple, sin
motivo — el backend cierra con `validTo = ahora`, no recibe fecha),
no "Editar" — evita ofrecer un control que el backend va a rechazar.
Solo nombre y mapeo contable son editables in-place.

### 3.5 Stock actual en el detalle del ítem: composición sin backend nuevo

Decisión ya aprobada (§1.3). El backend expone stock **por depósito**
(`GET /companies/:id/warehouses/:warehouseId/stock?itemId=`), y los
depósitos cuelgan de una sucursal
(`GET /companies/:id/branches/:branchId/warehouses`) — no existe un
endpoint "stock de este ítem en toda la empresa". El detalle del ítem
compone esto en dos etapas, ambas en paralelo dentro de cada etapa
(`useQueries` de TanStack Query, no una cascada secuencial innecesaria):

1. `useBranches(companyId)` (ya existe, de F1) → lista de sucursales
   activas.
2. Por cada sucursal, en paralelo: `GET .../branches/:branchId/
   warehouses` → depósitos.
3. Por cada depósito resultante, en paralelo: `GET .../warehouses/
   :warehouseId/stock?itemId=` → `{ quantity, averageCost }` para ese
   depósito (o ausente si nunca hubo movimiento).

Resultado: una tabla "Sucursal | Depósito | Cantidad | Costo promedio"
en el detalle del ítem, **solo si `tracksStock`** (un Servicio no tiene
nada que mostrar acá). Sin paginación — el número de depósitos de una
empresa es chico. Este composition vive en un hook propio
(`useItemStockAcrossWarehouses`, `lib/api/catalog/items.ts`) para no
mezclar la lógica de dos/tres llamadas encadenadas dentro del componente
de UI.

### 3.6 Exportación CSV: descarga de archivo, no JSON

`GET /items/export` devuelve `text/csv` crudo, no JSON — no encaja en el
patrón `apiFetch<T>` (que asume JSON). Se implementa como una función
aparte que hace `fetch` directo contra `/api/backend/companies/:id/
items/export?...`, lee la respuesta como `Blob` y dispara la descarga
del navegador (`URL.createObjectURL` + click en un `<a>` invisible) — no
pasa por TanStack Query (no es estado para cachear, es una acción
puntual), mismo criterio que `login`/`logout` en `lib/api/auth.ts`.

## 4. Rutas y componentes

```
(authenticated)/[companyId]/catalogo/
  layout.tsx                      # tabs: Productos | Servicios | Categorías | Impuestos | Listas de precio
  productos/
    page.tsx                       # ItemsTable filtrado type=PRODUCT
    [itemId]/
      page.tsx                     # detalle + stock actual (si tracksStock)
  servicios/
    page.tsx                       # ItemsTable filtrado type=SERVICE
    [itemId]/
      page.tsx                     # detalle (sin stock, tracksStock siempre false)
  categorias/
    page.tsx                       # CategoryTree
  impuestos/
    page.tsx                       # TaxesTable
  listas-de-precio/
    page.tsx                       # PriceListsTable
    [priceListId]/
      page.tsx                     # tabla editable inline de precios por ítem

components/catalogo/
  items-table.tsx                  # compartido Productos/Servicios
  item-sheet.tsx                   # alta/edición, type fijo según tab
  item-stock-panel.tsx             # tabla de stock por depósito (§3.5)
  category-tree.tsx
  category-sheet.tsx
  taxes-table.tsx
  tax-sheet.tsx                    # solo alta (sin edición de tasa/vigencia)
  price-lists-table.tsx
  price-list-sheet.tsx
  price-list-items-table.tsx       # precios editables inline dentro de una lista

lib/api/catalog/
  categories.ts
  items.ts                         # incluye useItemStockAcrossWarehouses + exportItemsCsv
  taxes.ts
  price-lists.ts
```

Reutilizados sin cambios: `components/shared/data-table.tsx`,
`status-badge.tsx`, `confirm-dialog.tsx`; `components/parties/import-
dialog.tsx` (mismo `ImportDialog` de F2, parametrizado con
`useImportItems`); `lib/api/companies.ts::useBranches`.

## 5. Casos de uso por pantalla y criterios de aceptación

### 5.1 Categorías

Árbol completo de la empresa, alta (raíz o subcategoría), editar nombre,
activar/desactivar sin motivo.

**Criterios de aceptación:**
- AC1: crear una categoría raíz y una subcategoría las refleja en el
  árbol sin recargar.
- AC2: el selector de padre no ofrece la propia categoría ni sus
  descendientes al editar (evita el ciclo que el backend rechazaría).
- AC3: un usuario sin rol de gestión ve el árbol sin controles de
  alta/edición.

### 5.2 Productos / Servicios (listado)

Búsqueda + filtros (categoría, estado) + import/export CSV + "+ Nuevo".
Clic en una fila navega al detalle.

**Criterios de aceptación:**
- AC1: crear un Producto con `tracksStock=true` y stock mínimo funciona;
  intentarlo con un Servicio no ofrece el campo (`tracksStock` fijo en
  `false`, sin control en la UI).
- AC2: importar un CSV con filas válidas e inválidas mezcladas reporta
  cada una correctamente.
- AC3: exportar respeta los filtros activos (búsqueda/categoría/estado)
  — el archivo descargado contiene exactamente lo que la tabla muestra.

### 5.3 Detalle de ítem

Datos completos de solo lectura + botón "Editar" + `ItemStockPanel` (solo
Productos con `tracksStock=true`).

**Criterios de aceptación:**
- AC1: un Producto con `tracksStock=false` o un Servicio no muestra el
  panel de stock.
- AC2: un Producto con `tracksStock=true` sin movimientos en ningún
  depósito muestra la tabla vacía con mensaje claro, no un error.
- AC3: el panel de stock refleja depósitos de todas las sucursales
  activas de la empresa.

### 5.4 Impuestos

Listado (tasa, vigencia, estado) + "+ Nuevo impuesto" + "Cerrar
vigencia" (solo en impuestos vigentes).

**Criterios de aceptación:**
- AC1: no existe ningún control para editar `rate`/`validFrom` de un
  impuesto existente.
- AC2: cerrar la vigencia de un impuesto vigente lo refleja como no
  vigente sin recargar.

### 5.5 Listas de precio

Listado + alta (marcar como predeterminada desmarca la anterior,
reflejado sin recargar) + gestión de precios por ítem (tabla con edición
inline del precio, agregar/quitar ítems de la lista).

**Criterios de aceptación:**
- AC1: marcar una lista nueva como predeterminada quita la marca de la
  que lo era antes.
- AC2: editar el precio de un ítem dentro de una lista lo persiste sin
  recargar la página.
- AC3: quitar un ítem de una lista lo remueve de la tabla de precios sin
  afectar al ítem en sí.

## 6. Estado

Todo lo backend-originado vive en TanStack Query (`01-organizacion-y-
estado.md` §4), incluida la composición de stock (§3.5, con `useQueries`).
La exportación CSV es una acción imperativa fuera de TanStack Query
(§3.6). Formularios con React Hook Form + Zod. Filtros y búsqueda van a
la URL, mismo criterio que F1/F2.

## 7. Fuera de alcance de F3 (diferido explícitamente)

- Pantallas de gestión de Stock (ajustes, transferencias, depósitos) —
  F4 completo, tal como ya estaba planificado.
- Pantallas de Comprobantes — F5 completo.
- Mapeo contable de Categoría/Impuesto (`salesAccountId`/
  `purchasesAccountId`) — el backend los acepta, pero `CategorySheet` y
  `TaxSheet` NO exponen esos campos: sin un selector de Plan de Cuentas
  (Contabilidad es F8, todavía no existe) pedirlos como un ID de texto
  libre sería mala UX. Se agregan a los formularios recién cuando F8
  tenga un picker de cuentas contables.
- Validación de dígito verificador de código de barras (EAN-13, etc.) —
  mismo criterio que CBU en F2: no forma parte de las reglas del
  backend, se trata como texto libre.
- Un endpoint agregado de "stock de un ítem en toda la empresa" — la
  composición client-side de §3.5 es suficiente mientras el número de
  depósitos por empresa sea chico; se revisita si se vuelve un problema
  real de rendimiento.
