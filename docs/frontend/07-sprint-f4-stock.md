# Sprint F4 — Frontend de Stock

Construye la UI completa sobre el módulo `inventory` del backend
(`docs/sprint-3/02-depositos-y-stock.md`, ya implementado y verificado en
Sprint 3.2). Sigue la misma metodología, arquitectura y estándares de F0–F3.

## 1. Alcance

Aprobado por el usuario tras F3: vista general de stock, stock por
producto, stock por depósito, listado y gestión de depósitos, ajustes de
stock, transferencias entre depósitos, historial de movimientos, filtros
(producto, depósito, fecha, tipo, estado), búsqueda rápida, costo
promedio, validaciones/mensajes claros, estados vacíos/carga/error/
confirmación, y navegación consistente Catálogo↔Stock.

**Entregable**: módulo de Stock completo y operable. E2E: crear depósito
→ ajustar stock (entrada) → consultar por producto y por depósito →
transferir entre depósitos → consultar historial → verificar rechazo de
operación inválida → recargar y confirmar persistencia.

## 2. Relevamiento del contrato backend (resumen)

Fuente: `docs/sprint-3/02-depositos-y-stock.md` (reglas RN-STK-01 a 13) +
lectura directa de código en `apps/api/src/modules/inventory/`.

### 2.1 Entidades

- **`Warehouse`** (Depósito): `id, companyId, branchId, name, isActive`.
  Único por `(branchId, name)` (RN-STK-02). Nunca se borra, solo se
  desactiva (RN-STK-03).
- **`Stock`**: `companyId, itemId, warehouseId, quantity (3 decimales),
  averageCost (4 decimales)`. Clave primaria `(itemId, warehouseId)`.
  **Nunca se escribe directamente** (RN-STK-04) — es 100% derivado de
  `StockMovement`. No existe concepto de "reservado" ni "disponible":
  solo hay una cantidad total (`quantity`). El campo "disponible/
  reservado/total" pedido en el brief **no aplica** — el backend no lo
  soporta (ver §7).
- **`StockMovement`**: ledger append-only. `type` ∈ `PURCHASE_IN |
  SALE_OUT | ADJUSTMENT_IN | ADJUSTMENT_OUT | TRANSFER_IN | TRANSFER_OUT
  | RETURN_IN | RETURN_OUT` (F4 solo genera `ADJUSTMENT_*` y
  `TRANSFER_*` — el resto los generará F5/Comprobantes reutilizando el
  mismo `ApplyStockMovementService`). `quantity` siempre positivo (el
  signo lo da `type`). `unitCost`: en una entrada es el costo que
  ingresó el usuario; en una salida es un *snapshot* del `averageCost`
  vigente (RN-STK-05) — no lo edita el usuario. `reason` obligatorio en
  toda salida (RN-STK-07). `transferGroupId` agrupa el par de una
  transferencia (RN-STK-08).

### 2.2 Endpoints (todos `[CTX]`, ver tabla completa en el doc de sub-sprint 3.2)

| Método | Endpoint | Uso en F4 |
|---|---|---|
| `GET/POST` | `.../branches/:branchId/warehouses` | Listado y alta de depósitos |
| `GET/PATCH` | `.../branches/:branchId/warehouses/:warehouseId` | Detalle y edición |
| `POST` | `.../warehouses/:warehouseId/(de)activate` | Activar/desactivar |
| `GET` | `.../companies/:id/warehouses/:warehouseId/stock?itemId=` | Stock de un depósito (todos los ítems, o uno) |
| `GET` | `.../warehouses/:warehouseId/stock-movements?itemId&type&from&to` | Historial (kardex) |
| `POST` | `.../warehouses/:warehouseId/stock-movements/adjustment` | Ajuste `{itemId, direction: IN\|OUT, quantity, unitCost?, reason?}` |
| `POST` | `.../companies/:id/stock-transfers` | Transferencia `{fromWarehouseId, toWarehouseId, itemId, quantity, reason}` |

**Importante**: no existe un endpoint de "stock de toda la empresa" ni de
"movimientos de toda la empresa" — todo es por depósito. La Vista
general (§3.2) y el listado de Depósitos (§3.3) se arman componiendo
client-side sobre estos endpoints por-depósito, exactamente el patrón ya
aprobado y construido en F3 (`useItemStockAcrossWarehouses`).

### 2.3 Errores (ya en español, listos para mostrar tal cual)

`WarehouseNotFoundError` (404), `InvalidWarehouseBranchError`,
`DuplicateWarehouseNameError`, `WarehouseAlreadyInTargetStateError`,
`ItemDoesNotTrackStockError`, `InsufficientStockError`,
`MissingReasonError`, `MissingUnitCostError`, `SameWarehouseTransferError`,
`InvalidQuantityError` (400). Reutilizan `ApiError.message` vía
`apiFetch`, mismo patrón que Catálogo/Clientes.

### 2.4 Autorización

RN-STK-11: lectura abierta a cualquier miembro activo; escritura
(`ROLES_THAT_CAN_MANAGE_COMPANY`) — mismo patrón exacto que Catálogo/
Clientes/Proveedores, se reutiliza `useCurrentMembership` +
`ROLES_THAT_CAN_MANAGE_COMPANY` sin cambios.

## 3. Decisiones técnicas

### 3.1 `lib/api/inventory/` como fuente única de tipos y hooks

F3 declaró `Warehouse`/`Stock` de forma ad-hoc dentro de
`lib/api/catalog/items.ts` (única necesidad en ese momento: el panel de
stock del ítem). F4 los centraliza en un módulo nuevo y hace que
`items.ts` importe desde ahí — una sola fuente de verdad, cero
duplicación:

- `lib/api/inventory/warehouses.ts`: `Warehouse`, CRUD completo
  (`useWarehouses(companyId, branchId)`, `useWarehouse`,
  `useCreateWarehouse`, `useUpdateWarehouse`, `useActivateWarehouse`,
  `useDeactivateWarehouse`) + **`useAllWarehouses(companyId)`**: la
  composición sucursales-activas→depósitos-de-cada-sucursal ya escrita
  en F3, ahora extraída como hook reutilizable (antes vivía inline
  dentro de `useItemStockAcrossWarehouses`).
- `lib/api/inventory/stock.ts`: `Stock`, `useStock(companyId,
  warehouseId, itemId?)`, y **`useCompanyStockOverview(companyId)`**
  (Vista general: `useAllWarehouses` + una `Stock[]` por depósito vía
  `useQueries`, cruzado con `useItems` para mostrar nombre/SKU — mismo
  patrón de 2 etapas paralelas de F3, aplicado en la dirección inversa:
  antes "un ítem en todos los depósitos", ahora "todos los ítems en
  todos los depósitos").
- `lib/api/inventory/stock-movements.ts`: `StockMovement`,
  `useStockMovements(companyId, warehouseId, filters)`,
  `useCreateStockAdjustment`, `useCreateStockTransfer`.
- `lib/api/catalog/items.ts`: `useItemStockAcrossWarehouses` pasa a
  importar `Warehouse`/`Stock` desde `lib/api/inventory/` y a usar
  `useAllWarehouses` internamente, sin cambiar su firma pública ni su
  comportamiento observable (se re-verifica con los tests/E2E de F3 ya
  existentes antes de cerrar F4 — "sin regresiones").

### 3.2 Información arquitectónica (rutas)

```
/[companyId]/stock/
  layout.tsx              — tabs: Vista general | Por producto | Depósitos | Transferencias
  general/page.tsx        — Vista general (todo depósito × todo ítem)
  productos/page.tsx      — Stock por producto (buscar ítem → ItemStockPanel)
  depositos/page.tsx      — Listado y gestión de depósitos (todas las sucursales)
  depositos/[warehouseId]/page.tsx
                           — Detalle: Stock actual (por depósito) + Historial
                             de movimientos + acciones (Ajustar / Transferir)
  transferencias/page.tsx — Formulario de transferencia entre depósitos
```

Por qué esta forma y no una pestaña por cada bullet del brief: "Stock por
depósito" y "Historial de movimientos" son ambos datos **de un depósito
concreto**, igual que F3 unificó Productos/Servicios en una pantalla
filtrada — acá el detalle de depósito reúne ambos en una sola pantalla
con dos secciones, evitando dos rutas casi vacías que solo tendrían
sentido una vez que ya elegiste un depósito. "Transferencias" sí es una
pestaña propia (el brief la lista aparte) pero también queda accesible
como acción rápida desde el detalle de un depósito (con
`fromWarehouseId` precargado vía query param), sin duplicar el formulario.

### 3.3 Vista general y Depósitos: sin selector de sucursal obligatorio

`useAllWarehouses` ya trae depósitos de **todas** las sucursales activas
en una sola consulta compuesta — la Vista general y el listado de
Depósitos muestran una columna "Sucursal" en vez de forzar elegir una
sucursal primero (mejor UX para el caso común de una sola sucursal, y
sigue funcionando igual de bien con varias). El alta de un depósito sí
pide sucursal (un `Select`, poblado con `useBranches` — igual que F3 con
categorías/padres) porque el backend lo exige en la URL
(`POST .../branches/:branchId/warehouses`).

### 3.4 Ajuste y transferencia: formularios con validación espejada, no reimplementada

Los `Sheet`/formularios de ajuste y transferencia validan en el cliente
solo lo mínimo para UX (cantidad positiva, motivo obligatorio en salidas/
transferencias, costo obligatorio en una entrada) — exactamente las
mismas condiciones que ya aplica el backend (RN-STK-06/07/13), **sin
reimplementar el cálculo de promedio ponderado ni la validación de stock
negativo**: eso lo resuelve `ApplyStockMovementService` server-side, el
frontend solo muestra el `ApiError.message` tal cual si el backend
rechaza (ej. `InsufficientStockError`).

### 3.5 "Disponible / reservado / total" — no aplica

El brief pide mostrarlo "cuando el backend lo soporte". Confirmado en el
relevamiento (§2.1): el backend solo tiene `quantity` (total). No hay
reservas (no existen pedidos/presupuestos pendientes en el sistema
todavía). Se muestra únicamente "Cantidad" — sin inventar una columna
"Disponible" idéntica a "Total" que confundiría al usuario. Se documenta
como fuera de alcance (§7), no como una omisión.

### 3.6 Navegación Catálogo ↔ Stock

- Ítem → Stock: el panel de stock del detalle del ítem (F3,
  `ItemStockPanel`) ya muestra cantidad/costo por depósito; cada fila
  ahora enlaza a `/stock/depositos/[warehouseId]`.
- Stock → Catálogo: en "Stock por producto", el selector de ítem
  enlaza "Ver ficha del producto" hacia `/catalogo/productos/[itemId]`
  (o `/servicios/[itemId]` según `type`).
- Sidebar: "Stock" (`nav-items.ts`) pasa de placeholder
  (`{ label: "Stock", icon: Boxes }`, sin `href`, botón "próximamente")
  a `href: "stock/general"` — mismo cambio que activó "Catálogo" en F3.

### 3.7 Aislamiento de datos de prueba E2E (decisión escalada y aprobada)

Escalado antes de implementar: la suite E2E completa venía acumulando
filas de cada corrida (Categorías/Ítems/Impuestos/Listas "E2E …") sobre
la misma empresa sembrada ("Empresa Piloto SRL"), degradando el
rendimiento de hidratación con el tiempo. Aprobado: **empresa E2E
dedicada + reset por `companyId` antes de la suite** (opción de menor
riesgo — nunca puede tocar otra empresa por error, a diferencia de un
borrado por coincidencia de texto).

- `apps/api/prisma/seed.ts`: nueva empresa fija `Empresa E2E` (id fijo,
  mismo patrón que `Empresa Piloto SRL`), con una sucursal fija
  ("Sucursal E2E") y el mismo usuario `admin@estrategos.local` como
  miembro (rol "Administrador de empresa").
- `apps/api/prisma/reset-e2e-company.ts` (script standalone, `ts-node`,
  fuera de Nest — mismo criterio que `seed.ts`): borra, **solo para el
  `companyId` de Empresa E2E**, en orden de dependencias
  (`StockMovement → Stock → Warehouse → PriceListItem → PriceList →
  ItemTax → Item → Category → Tax`). Nunca toca `Company`, `Branch`,
  `CompanyUser`, `User` ni ninguna otra empresa. Expuesto como
  `npm run reset:e2e` en `apps/api/package.json`.
- `apps/web/playwright.config.ts`: `globalSetup` que ejecuta ese script
  (vía `npm run reset:e2e --workspace=@estrategos/api`, mismo mecanismo
  cross-paquete que ya usa `predev`/`prebuild`) antes de correr toda la
  suite — cada corrida completa arranca con Empresa E2E limpia.
- `apps/web/e2e/helpers.ts`: `loginAsAdmin` ahora selecciona
  explícitamente "Empresa E2E" en `/seleccionar-empresa` (antes hacía
  clic en el primer botón de la lista, fragile ahora que hay 3+
  empresas). F0/F1/F2/F3 specs siguen pasando por el mismo helper sin
  cambios de aserciones — solo cambia **sobre qué empresa** corren,
  beneficiándose también ellos de arrancar sobre datos limpios.

## 4. Rutas y componentes

```
app/(authenticated)/[companyId]/stock/
  layout.tsx
  general/page.tsx
  productos/page.tsx
  depositos/page.tsx
  depositos/[warehouseId]/page.tsx
  transferencias/page.tsx

components/stock/
  warehouse-sheet.tsx          — alta/edición de depósito (nombre + sucursal)
  warehouses-table.tsx         — listado de depósitos (todas las sucursales), activar/desactivar
  stock-overview-table.tsx     — Vista general (sucursal, depósito, ítem, SKU, cantidad, costo)
  item-stock-picker.tsx        — buscador de ítem (tracksStock=true) para "Por producto"
  stock-adjustment-sheet.tsx   — ajuste de stock (entrada/salida)
  stock-transfer-form.tsx      — formulario de transferencia
  stock-movements-table.tsx    — historial/kardex con filtros (ítem, tipo, fechas)
```

Reutilizados sin cambios: `DataTable`, `ActiveStatusBadge`/`StatusBadge`,
`ConfirmDialog`, `Sheet`/`Form`/`Select`/`Input`/`Checkbox` de
`components/ui`, `ItemStockPanel` (F3, ahora enlaza a depósito).

## 5. Casos de uso por pantalla y criterios de aceptación

### 5.1 Vista general (`/stock/general`)

- Tabla con todas las combinaciones depósito×ítem con `quantity > 0` o
  con movimientos (para no listar miles de filas en cero); columnas:
  Sucursal, Depósito, Ítem, SKU, Cantidad, Costo promedio.
- Filtros: por depósito (select), por ítem (búsqueda de texto),
  búsqueda general (`DataTable`).
- Estado vacío: "Todavía no hay stock cargado."; carga: "Cargando…";
  error: mensaje + reintentar (mismo patrón de F1-F3).

### 5.2 Por producto (`/stock/productos`)

- Buscador de ítem (`tracksStock=true` únicamente — un Servicio nunca
  tiene stock, RN-CAT-07/RN-STK-13); al elegir uno, `?itemId=` en la URL
  (compartible) y se renderiza `ItemStockPanel` (reutilizado de F3).
- Sin ítem elegido: mensaje "Elegí un producto para ver su stock."

### 5.3 Depósitos (`/stock/depositos`)

- Listado de todos los depósitos (todas las sucursales), columna
  Sucursal, Nombre, Estado. Filtro por estado (Todos/Activos/Inactivos).
- "+ Nuevo depósito": `WarehouseSheet` (nombre + sucursal). Validación:
  nombre único por sucursal (`DuplicateWarehouseNameError`, mensaje del
  backend mostrado tal cual).
- Activar/desactivar con `ConfirmDialog` (mismo patrón que Categorías/
  Impuestos). Activar/desactivar ya-en-ese-estado → 400 con mensaje
  claro (RN-STK-12).
- Click en una fila → `/stock/depositos/[warehouseId]`.

### 5.4 Detalle de depósito (`/stock/depositos/[warehouseId]`)

- Encabezado: nombre, sucursal, estado, botón "Editar".
- Sección "Stock actual": tabla ítem/SKU/cantidad/costo promedio (vía
  `useStock(companyId, warehouseId)` sin `itemId`, trae todos los ítems
  con stock en este depósito).
- Botón "Ajustar stock" → `StockAdjustmentSheet` (elegir ítem
  `tracksStock=true`, dirección IN/OUT, cantidad, costo si es entrada,
  motivo si es salida). Tras confirmar, refresca "Stock actual" e
  "Historial".
- Botón "Transferir a otro depósito" → navega a
  `/stock/transferencias?fromWarehouseId=...` con el origen precargado.
- Sección "Historial de movimientos": tabla con filtros (ítem, tipo,
  rango de fechas) vía `useStockMovements`.

### 5.5 Transferencias (`/stock/transferencias`)

- Formulario: depósito origen, depósito destino (ambos con todos los
  depósitos activos de la empresa, `useAllWarehouses`), ítem
  (`tracksStock=true`), cantidad, motivo (obligatorio).
- Validaciones de UX antes de enviar: origen ≠ destino, cantidad > 0,
  motivo no vacío — el backend valida lo mismo (RN-STK-06/07/09/13) y su
  mensaje se muestra tal cual si de todos modos falla (ej. sin stock
  suficiente en origen).
- Éxito: toast + limpia el formulario; opcionalmente enlaza a
  "Ver historial" del depósito destino.

## 6. Estado

Mismo criterio que F1-F3: TanStack Query para todo lo backend-originado,
incluidas las dos composiciones nuevas (`useAllWarehouses`,
`useCompanyStockOverview`) con `useQueries` en dos etapas. Formularios
con React Hook Form + Zod. Filtros en la URL donde tiene sentido
compartir el estado (`?itemId=` en Por producto).

## 7. Fuera de alcance de F4 (diferido explícitamente)

- Stock "disponible" y "reservado" — el backend no tiene ese concepto
  (no hay pedidos/presupuestos pendientes en el sistema); solo existe
  cantidad total. Se revisita si F5+ introduce reservas reales.
- Historial de movimientos "de toda la empresa" en una sola vista — no
  hay endpoint agregado; se mantiene por-depósito (igual que el backend
  lo expone). Si se vuelve una necesidad real, se evalúa entonces un
  endpoint agregado (mismo criterio que el stock por-ítem de F3 §3.5).
- Exponer `Company.allowNegativeStock` como toggle editable en
  Configuración > Empresa — el campo existe y se lee, pero no hay UI
  para cambiarlo (pertenece a F1/Empresa, fuera del alcance de este
  sprint; se deja como recomendación para F5+ si hace falta).
- Generación de `PURCHASE_IN`/`SALE_OUT`/`RETURN_IN`/`RETURN_OUT` —
  estos movimientos los originan Comprobantes (F5), no Stock.
