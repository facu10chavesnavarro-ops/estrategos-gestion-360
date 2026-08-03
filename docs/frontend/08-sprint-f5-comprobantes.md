# Sprint F5 — Frontend de Comprobantes

Construye la UI completa sobre el módulo `vouchers` del backend
(`docs/sprint-3/03-comprobantes.md` y `docs/sprint-3/04-tesoreria.md`, ya
implementado y verificado en Sprints 3.3/3.4). Sigue la misma
metodología, arquitectura y estándares de F0–F4.

## 1. Alcance

Listado de comprobantes con filtros, vista de detalle, creación de
Factura de Venta, Factura de Compra y Nota de Crédito, selección de
cliente/proveedor/punto de venta/depósito, líneas de ítems con
cantidad/precio/descuento/impuestos, totales, validaciones, estados
vacío/carga/error/confirmación, navegación coherente con Clientes,
Proveedores, Catálogo y Stock.

**Agregado necesario no listado explícitamente en el brief**: gestión de
Puntos de Venta (listado + alta + edición de nombre + activar/
desactivar). El brief pide "selección de punto de venta" al crear un
comprobante, pero no hay ningún punto de venta disponible para elegir
si no existe antes una pantalla para crearlo — mismo caso que Depósitos
en F4, es estrictamente necesario para que el flujo principal del
sprint sea usable, no una ampliación de alcance.

**Entregable**: módulo de Comprobantes completo y operable. E2E: crear
punto de venta → Factura de Venta con 2 líneas (una con producto que
trackea stock, otra sin) → verificar stock descontado → Nota de Crédito
sobre esa factura → verificar stock repuesto → Factura de Compra →
verificar stock incrementado → rechazos esperados (cliente inactivo, NC
sin comprobante relacionado) → recargar y confirmar persistencia.

## 2. Relevamiento del contrato backend (resumen)

Fuente: `docs/sprint-3/03-comprobantes.md` (RN-VOU-01 a 12),
`docs/sprint-3/04-tesoreria.md` (RN-CTA-04), `docs/sprint-4/00-
arquitectura-contabilidad.md` §2.3, y lectura directa de
`apps/api/src/modules/vouchers/`.

### 2.1 Entidades

- **`PointOfSale`**: `id, companyId, branchId, code, name, isActive`.
  `code` inmutable tras crear (identificador fiscal). Único por
  `(companyId, code)`.
- **`VoucherType`**: catálogo global de plataforma (como `Role`), **sin
  filtro de empresa**, `GET /voucher-types` sin `[CTX]`. Campos:
  `code, name, flow (SALE|PURCHASE), affectsStock (IN|OUT|NONE),
  affectsCurrentAccount (DEBIT|CREDIT|NONE), requiresCae, isCreditNote,
  relatedVoucherRequired, isActive`. Las 7 filas reales sembradas:
  `FA_A/FA_B/FA_C` (venta, `affectsStock: OUT`), `NC_A/NC_B/NC_C` (nota
  de crédito de venta, `isCreditNote: true`, `relatedVoucherRequired:
  true`, `affectsStock: IN`), `FC` (compra, `affectsStock: IN`). **No
  hay Nota de Débito ni ningún otro tipo** — el selector de tipo de
  comprobante muestra únicamente lo que devuelve este endpoint, sin
  hardcodear opciones.
- **`Voucher`**: inmutable una vez creado (RN-VOU-03, no hay
  `UpdateVoucherUseCase` ni anulación ni `status` — crear = confirmar en
  un solo paso, sin borrador). `partyId` es el id de `Party`, **no** de
  `Customer`/`Supplier` — el frontend debe enviar `customer.partyId` /
  `supplier.partyId` (campo que ya exponen `lib/api/customers.ts` y
  `suppliers.ts` desde F2). `warehouseId` es único por comprobante (no
  por línea). `number` lo asigna el backend, nunca se informa.
  `subtotal/taxTotal/total` los calcula el backend — el `total` puede
  llegar como `'1000'` sin los 2 decimales cuando no hay centavos, hay
  que formatearlo siempre al mostrar.
- **`VoucherLine`**: `itemId, description, quantity (3 dec), unitPrice
  (4 dec), discountPercentage (2 dec), subtotal, taxes[]` (snapshot
  `{taxId, rate, amount}` congelado al confirmar, RN-VOU-05).

### 2.2 Endpoints

| Método | Endpoint | Uso |
|---|---|---|
| `GET/POST` | `companies/:id/branches/:branchId/points-of-sale` | Listado y alta de puntos de venta |
| `GET/PATCH` | `.../points-of-sale/:posId` | Detalle y edición (solo `name`) |
| `POST` | `.../points-of-sale/:posId/(de)activate` | Activar/desactivar |
| `GET` | `voucher-types` | Catálogo de tipos, **sin** `companyId` |
| `GET` | `companies/:id/vouchers?partyId&voucherTypeId&from&to` | Listado, todos opcionales, sin paginación |
| `POST` | `companies/:id/vouchers` | Alta = confirmación (ver DTO §2.4) |
| `GET` | `companies/:id/vouchers/:voucherId` | Detalle completo con líneas e impuestos |

**Importante — dos convenciones de `branchId` distintas en el mismo
módulo**: en Puntos de Venta va en el **path** (igual que Depósitos en
F4); en la creación de comprobante va en el **body** del POST (el
comprobante no cuelga de una URL de sucursal). Respetarlas tal cual
están, no unificar.

**No existe endpoint de preview/cálculo de totales** — el único POST
numera y confirma en un solo paso (ver decisión 3.2). Tampoco hay
paginación en el listado.

### 2.3 Autorización (RN-VOU-10, mismo patrón que F1-F4)

Lectura (listado/detalle de comprobantes, listado/detalle de puntos de
venta, catálogo de tipos): cualquier miembro activo. Escritura (crear
comprobante, CRUD de puntos de venta): `ROLES_THAT_CAN_MANAGE_COMPANY`
— mismo `useCurrentMembership` + constante ya usada en Catálogo/Stock.

### 2.4 DTO de creación (`POST /companies/:id/vouchers`)

```ts
{
  branchId: string;          // de la sucursal del punto de venta elegido
  pointOfSaleId: string;
  voucherTypeId: string;
  partyId: string;           // customer.partyId o supplier.partyId
  warehouseId?: string;      // condicional, ver RN-VOU-07
  issueDate?: string;        // default: ahora
  relatedVoucherId?: string; // obligatorio si el tipo es Nota de Crédito
  lines: Array<{
    itemId: string;          // F5 no ofrece línea libre (decisión 3.3)
    description: string;
    quantity: string;
    unitPrice: string;
    discountPercentage?: string;
  }>;
}
```

### 2.5 Integración con Stock, Tesorería y Contabilidad — 100% automática

Confirmado en el relevamiento (`create-voucher.use-case.ts`): dentro de
una única transacción, `POST /vouchers`:

1. Numera (`VoucherCounter`, por `pointOfSaleId + voucherTypeId`, sin
   huecos ni duplicados bajo concurrencia — ya probado en Sprint 3.3).
2. Si `voucherType.affectsStock !== 'NONE'`: por cada línea cuyo
   `item.tracksStock === true` (las de Servicio o producto sin stock se
   saltean automáticamente), aplica un `StockMovement` — `SALE_OUT`/
   `PURCHASE_IN` para Facturas, `RETURN_IN`/`RETURN_OUT` para Notas de
   Crédito (`resolveStockMovementType`, dirección ya resuelta en el
   seed de `VoucherType`, **no se invierte en runtime**).
3. Si `voucherType.affectsCurrentAccount !== 'NONE'`: mueve la cuenta
   corriente del cliente o proveedor. Sin campo ni lógica visible en el
   frontend — es completamente transparente.
4. Si la empresa activó Contabilidad (`AccountingSettings`) y el tipo
   afecta cuenta corriente: genera un asiento automático balanceado.
   También transparente para el flujo normal — solo importa para la
   decisión 3.3 (líneas sin ítem).

El frontend **no reimplementa nada de esto**. Solo replica, para dar
feedback antes del submit, la única condición documentada como
validación previa (RN-VOU-07): si el tipo de comprobante afecta stock y
alguna línea tiene un ítem con `tracksStock=true`, exigir `warehouseId`
en el formulario — el backend la vuelve a validar igual
(`MissingWarehouseError`) y es la fuente de verdad real.

### 2.6 Errores (ya en español, se muestran tal cual vía `ApiError.message`)

`PointOfSaleNotFoundError`, `VoucherNotFoundError`,
`VoucherTypeNotFoundError` (404); `InvalidPointOfSaleBranchError`,
`DuplicatePointOfSaleCodeError`, `PointOfSaleAlreadyInTargetStateError`,
`InvalidVoucherPointOfSaleError`, `InvalidCounterpartyError` (cliente/
proveedor inactivo, RN-VOU-04), `MissingRelatedVoucherError`/
`InvalidRelatedVoucherError` (Nota de Crédito, RN-VOU-08),
`MissingWarehouseError` (RN-VOU-07), `EmptyVoucherLinesError`,
`InvalidVoucherLineItemError`, `InvalidVoucherLineQuantityError`,
`InsufficientStockError` (propagado de `inventory`, RN-STK-06) (400).

## 3. Decisiones técnicas

### 3.1 Escalado y aprobado por el usuario antes de implementar

Tres decisiones de arquitectura detectadas durante el relevamiento y
presentadas con alternativas vía `AskUserQuestion` — las tres resueltas
con la opción recomendada:

1. **Doble-submit / reintentos**: el backend no tiene ninguna
   protección (sin idempotency key, sin deduplicación) — un reintento
   real genera dos comprobantes, dos movimientos de stock y dos
   asientos independientes. **Aprobado: mitigación solo en frontend** —
   deshabilitar el botón de confirmar durante `form.formState.isSubmitting`
   (mismo patrón ya usado en toda la app desde F1) y no usar reintento
   automático de red en la mutación de creación (`useMutation` sin
   `retry`, comportamiento por defecto de TanStack Query en mutaciones).
   No se modifica el backend en este sprint; queda como recomendación
   para F6+ si se detectan reintentos reales en producción (§11 del
   informe de cierre).
2. **Preview de totales**: no existe endpoint de cálculo. **Aprobado:
   replicar la fórmula documentada (RN-VOU-05/09) en el cliente** para
   mostrar un total estimado en vivo mientras se arma el comprobante —
   `subtotal línea = cantidad × precio × (1 - descuento/100)`, impuesto
   por línea = `subtotal línea × tasa vigente del ítem / 100`, usando
   `useTaxes(companyId, true)` (impuestos vigentes) cruzado con
   `item.taxIds`. El total mostrado se etiqueta como estimado en la UI;
   el total real y definitivo es el que devuelve el backend en la
   respuesta del POST, que es el que se muestra en el detalle
   post-creación.
3. **Líneas sin ítem** (texto libre): válidas solo si la empresa no
   activó Contabilidad. **Aprobado: no ofrecerlas en F5** — toda línea
   exige seleccionar un ítem de Catálogo. Evita la ambigüedad sin
   necesitar consultar `AccountingSettings` al cargar el formulario.

### 3.2 Sin pantalla de "vista previa" server-side — cálculo optimista

Como no hay preview del backend, el formulario de creación calcula y
muestra subtotal/impuestos/total en el cliente (decisión 3.1.2) pero
envía el comprobante recién al confirmar. Si el backend rechaza (ítem
inactivo, cliente inactivo, stock insuficiente, etc.) se muestra el
`ApiError.message` tal cual y el formulario permanece abierto con los
datos cargados — mismo patrón que el rechazo de ajuste de stock en F4.

### 3.3 `partyId`, no `customerId`/`supplierId`

El selector de contraparte en el formulario de comprobante usa
`useCustomers`/`useSuppliers` (ya construidos en F2) filtrados por
`isActive: true`, pero el valor que viaja en el `Select` y en el DTO es
`partido.partyId`, no `party.id`. Filtrado por `flow` del tipo de
comprobante elegido: `SALE` → clientes, `PURCHASE` → proveedores. El
backend revalida igual (`InvalidCounterpartyError`) si de todos modos
se manda una contraparte inactiva o del rol equivocado.

### 3.4 Punto de venta implica sucursal — sin selector de sucursal duplicado

`CreateVoucherRequestDto.branchId` debe coincidir con la sucursal real
del punto de venta elegido (`InvalidVoucherPointOfSaleError` si no).
En vez de pedir sucursal y punto de venta por separado, el formulario
solo muestra un selector de punto de venta (`useAllPointsOfSale`,
mismo patrón 2-etapas que `useAllWarehouses` de F4) y completa
`branchId` automáticamente desde el punto de venta elegido — mismo
criterio que F4 §3.3 (no forzar un selector de sucursal cuando el dato
ya está implícito en otra elección).

### 3.5 Puntos de Venta: mismo patrón que Depósitos, sin pantalla de detalle propia

A diferencia de Depósitos (F4), un punto de venta no tiene "contenido"
propio para mostrar en una pantalla de detalle (no hay stock ni
movimientos asociados a él) — solo `code` (inmutable) y `name`
(editable). Listado + `Sheet` de alta/edición + activar/desactivar
alcanza, mismo criterio que Categorías/Impuestos en F3 (sin detalle
dedicado cuando no hay contenido adicional que mostrar).

### 3.6 Notas de Crédito: mismo formulario de Venta, con selector de comprobante relacionado

No hay un caso de uso ni una pantalla separada en el backend para NC —
es el mismo `POST /vouchers` con `voucherTypeId` de una NC y
`relatedVoucherId` obligatorio. El formulario de "Nueva venta" ofrece,
en el selector de tipo de comprobante, tanto Facturas como Notas de
Crédito (ambas `flow: SALE`); al elegir una NC aparece un selector
adicional "Comprobante a corregir" que busca entre los comprobantes ya
emitidos a la contraparte elegida (`useVouchers(companyId, {partyId})`,
excluyendo notas de crédito). El backend valida que el comprobante
relacionado sea de la misma contraparte (RN-VOU-08); no valida que sea
del mismo tipo/letra (hallazgo del relevamiento, no una regla a
replicar en el frontend — se deja pasar lo que el backend permita).

### 3.7 Precio de línea: precarga desde `Item.costPrice`, editable

El backend no autocompleta precio desde listas de precio (decisión ya
tomada en el propio backend, `docs/sprint-3/03-comprobantes.md` §0.5).
Para no forzar al usuario a tipear todo a mano, al elegir un ítem en
una línea se precarga `unitPrice` con `item.costPrice` (ya disponible
sin queries adicionales, viene en `useItems`) si existe; el campo
queda editable y el usuario puede cambiarlo antes de confirmar. Es una
conveniencia de UX (prefill), no lógica de negocio: el valor final
siempre es el que el usuario confirma y el que el backend recibe tal
cual.

### 3.8 Extensión del reset E2E (Sprint F4 §3.7) para cubrir `vouchers`

Mismo mecanismo aprobado en F4: reset por `companyId`, nunca por texto.
Se agrega al inicio de `reset-e2e-company.ts` (antes de Inventario/
Clientes-Proveedores/Catálogo, porque `Voucher` referencia `warehouseId`,
`partyId` e `itemId` de esas tablas): anula `Voucher.relatedVoucherId`
(autorreferencia) para poder borrar sin violar la FK, borra
`VoucherLineTax` → `VoucherLine` → `Voucher` → `VoucherCounter` →
`PointOfSale`, todo `where companyId = E2E_COMPANY_ID`.
**`VoucherType` y `PaymentMethod` son catálogos globales de plataforma
(como `Role`) y nunca se tocan** — no tienen `companyId`.
`AccountingSettings`/`JournalEntry` quedan fuera del reset de F5: la
suite E2E de este sprint no activa Contabilidad para la Empresa E2E
(ver §7, fuera de alcance), así que no generan datos que limpiar
todavía — se extenderá si un sprint futuro activa Contabilidad en E2E.

## 4. Rutas y componentes

```
app/(authenticated)/[companyId]/comprobantes/
  layout.tsx                     — tabs: Comprobantes | Puntos de venta
  page.tsx                       — listado + filtros + "+ Factura de venta" / "+ Factura de compra"
  [voucherId]/page.tsx           — detalle (cabecera, líneas, totales, acciones)
  nuevo/venta/page.tsx           — <VoucherForm flow="SALE" />
  nuevo/compra/page.tsx          — <VoucherForm flow="PURCHASE" />
  puntos-de-venta/page.tsx       — listado + gestión de puntos de venta

components/comprobantes/
  point-of-sale-sheet.tsx        — alta/edición de punto de venta (código inmutable tras crear)
  points-of-sale-table.tsx       — listado, activar/desactivar
  vouchers-table.tsx             — listado de comprobantes con filtros
  voucher-form.tsx               — formulario de alta (venta/compra/NC), líneas dinámicas, totales
  voucher-line-row.tsx           — fila de línea dentro del formulario (ítem, cantidad, precio, descuento, subtotal)

lib/api/vouchers/
  point-of-sale.ts                — PointOfSale, CRUD + useAllPointsOfSale (mismo patrón useAllWarehouses)
  voucher-types.ts                — VoucherType, useVoucherTypes (catálogo global, sin companyId)
  vouchers.ts                     — Voucher, VoucherLine, useVouchers, useVoucher, useCreateVoucher
```

Reutilizados sin cambios: `DataTable`, `StatusBadge`, `ConfirmDialog`,
`Sheet`/`Form`/`Select`/`Input` de `components/ui`, `useCustomers`/
`useSuppliers` (F2), `useItems`/`useTaxes` (F3), `useAllWarehouses`
(F4). `formatMoney` se extrae de `components/parties/current-account-
panel.tsx` (duplicado puntual desde F2) a `lib/utils.ts` como utilidad
compartida, dado que F5 lo necesita en al menos 3 lugares nuevos
(listado, detalle, formulario).

## 5. Casos de uso por pantalla

### 5.1 Puntos de venta (`/comprobantes/puntos-de-venta`)

Listado de todos los puntos de venta (todas las sucursales, mismo
criterio que Depósitos en F4 — sin selector de sucursal obligatorio).
Alta: código + nombre + sucursal (sucursal y código ya no editables
tras crear). Activar/desactivar con confirmación.

### 5.2 Listado de comprobantes (`/comprobantes`)

Tabla con número (con letra/código del tipo), tipo, contraparte, fecha,
total, badge "Nota de Crédito" cuando corresponda. Filtros: contraparte
(cliente o proveedor, según lo que exista), tipo de comprobante, rango
de fechas. Sin paginación de servidor — si la lista crece mucho, es una
mejora a pedir a futuro (documentado, no resuelto en F5). Botones
"+ Factura de venta" y "+ Factura de compra" (ocultos sin rol de
gestión). Click en una fila → detalle.

### 5.3 Detalle de comprobante (`/comprobantes/[voucherId]`)

Cabecera: tipo + número, fecha, contraparte (enlaza a
`/clientes/:id` o `/proveedores/:id`), punto de venta, depósito (si
tiene, enlaza a `/stock/depositos/:id`). Tabla de líneas con ítem
(enlaza a `/catalogo/productos|servicios/:id`), cantidad, precio,
descuento, impuestos, subtotal. Totales (subtotal, impuestos, total)
formateados con `formatMoney`. Si el tipo no es Nota de Crédito:
botón "Emitir Nota de Crédito" que navega a `/comprobantes/nuevo/venta
?relatedVoucherId=...` con la contraparte y el comprobante relacionado
precargados.

### 5.4 Nueva Factura de Venta / Nota de Crédito (`/comprobantes/nuevo/venta`)

Flujo guiado: 1) tipo de comprobante (Factura o Nota de Crédito,
filtrado a `flow: SALE`); 2) cliente activo; 3) si es NC, comprobante a
corregir (de esa contraparte); 4) punto de venta; 5) líneas (ítem +
cantidad + precio prellenado + descuento, `useFieldArray` para agregar/
quitar filas); 6) depósito (obligatorio solo si alguna línea trackea
stock); 7) totales estimados en vivo (decisión 3.1.2); 8) confirmar.
Botón deshabilitado mientras se envía (decisión 3.1.1). Éxito: toast +
redirige al detalle del comprobante creado.

### 5.5 Nueva Factura de Compra (`/comprobantes/nuevo/compra`)

Mismo formulero que 5.4 con `flow="PURCHASE"`: selector de tipo omitido
en la práctica (el único tipo con `flow: PURCHASE` es `FC`, se
preselecciona solo, sin Notas de Crédito de compra en el catálogo
actual), selector de proveedor activo en vez de cliente, resto idéntico
(líneas, depósito condicional, totales estimados, confirmar).

## 6. Estado

TanStack Query para todo lo backend-originado (`useVoucherTypes` cachea
el catálogo global sin `companyId` en la key). React Hook Form + Zod
para los formularios; el schema de `VoucherForm` se arma dinámicamente
con `useMemo` según el tipo de comprobante elegido (si exige depósito,
si exige comprobante relacionado) — mismo criterio que la validación
condicional de `stock-adjustment-sheet.tsx` en F4, aplicado con datos
que llegan en runtime en vez de estar fijos en el schema.

## 7. Fuera de alcance de F5 (diferido explícitamente)

- Líneas de comprobante sin ítem asociado (texto libre) — decisión
  3.1.3, se revisita si hay una necesidad real de conceptos ad-hoc
  (flete, descuentos generales) en un sprint futuro.
- Activar Contabilidad para la Empresa E2E / probar el asiento
  automático desde el frontend — Contabilidad no tiene pantallas
  todavía (es un sprint futuro); la integración ya es transparente y
  no requiere nada del frontend de F5 para funcionar cuando exista.
- CAE / facturación electrónica AFIP — el backend ya modela
  `cae`/`caeExpirationDate` como siempre `null` (fuera de alcance
  también en el backend, RN-VOU-12).
- Edición o anulación de un comprobante — no existe en el backend
  (RN-VOU-03); la única forma de corregir una operación es una Nota de
  Crédito.
- Paginación del listado de comprobantes — no hay soporte de backend
  todavía; se revisita si el volumen real lo requiere.
- Idempotency key en el backend para reintentos de red — decisión
  3.1.1, mitigado solo en frontend por ahora; recomendado para F6+ si
  se detectan duplicados reales en producción.
