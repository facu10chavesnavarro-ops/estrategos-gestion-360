# Changelog

Todos los cambios notables del proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y el
versionado, [Versionado Semántico](https://semver.org/lang/es/). A partir de esta
versión, cada módulo de sprint aprobado genera una nueva versión etiquetada.

## [web-0.6.0] - 2026-08-02

**Frontend Sprint F4 — Stock.** Cuarto módulo de negocio
(`docs/frontend/07-sprint-f4-stock.md`): mapea el módulo `inventory` del
backend (Depósitos, Stock, Movimientos de stock) sin agregar lógica de
negocio nueva. Escalado a decisión de arquitectura antes de implementar
(`AskUserQuestion`): la suite E2E completa venía acumulando datos de
cada corrida en la misma empresa sembrada, degradando el rendimiento;
se aprobó una empresa "Empresa E2E" dedicada con reset por `companyId`
antes de cada corrida completa (ver más abajo).

### Agregado

- **Pantalla Depósitos** (`/stock/depositos`): listado de todos los
  depósitos de todas las sucursales activas (`useAllWarehouses`, ver
  refactor abajo), alta/edición en `Sheet` (sucursal solo seleccionable
  al crear — un depósito no cambia de sucursal), activar/desactivar con
  confirmación, filtro por estado.
- **Detalle de depósito** (`/stock/depositos/[warehouseId]`): no existe
  un GET-por-id fuera del path anidado en sucursal, así que la pantalla
  busca el depósito en el listado ya cacheado por `useAllWarehouses`
  (mismo patrón que el detalle de lista de precios en F3). Header con
  acciones Editar/Transferir/Ajustar, tabla de "Stock actual" por ítem
  y "Historial de movimientos" con filtros (ítem, tipo, fecha).
- **Ajuste de stock** (`stock-adjustment-sheet.tsx`): entrada/salida con
  validación condicional (`costo unitario` requerido en entradas,
  `motivo` requerido en salidas, replicando RN-STK-07 en el cliente sin
  reimplementar la regla — el backend sigue siendo la fuente de verdad;
  el rechazo real de stock insuficiente lo devuelve el backend y se
  muestra tal cual). Selector de ítem limitado a productos con
  `tracksStock=true` (RN-STK-13).
- **Transferencias entre depósitos** (`/stock/transferencias`):
  formulario origen/destino/ítem/cantidad/motivo, valida
  origen≠destino en el cliente antes de enviar; acepta
  `?fromWarehouseId=` para prellenar el origen al llegar desde el
  detalle de un depósito. Redirige al depósito de destino al confirmar.
- **Vista general de stock** (`/stock/general`): sin endpoint nuevo,
  `useCompanyStockOverview` compone `useAllWarehouses` + una consulta
  de stock por depósito activo (`useQueries`) cruzada con `useItems`
  para nombre/SKU, filtrando cantidades en cero. Filtro por depósito.
- **Stock por producto** (`/stock/productos`): selector de ítem
  (productos con `tracksStock=true`) que reutiliza `ItemStockPanel`/
  `useItemStockAcrossWarehouses` ya construidos en F3, con enlace "Ver
  ficha del producto" de vuelta a Catálogo.
- **Navegación Catálogo↔Stock**: la celda "Depósito" del panel de stock
  en el detalle de ítem (F3) ahora enlaza a `/stock/depositos/:id`;
  ítem de sidebar "Stock" activado con `href` real (antes reservado).
- `lib/api/inventory/{warehouses,stock,stock-movements}.ts`: capa
  centralizada de acceso al backend `inventory`. `useAllWarehouses`
  generaliza a nivel de módulo la composición de dos etapas (sucursales
  activas → depósitos de cada una) que F3 ya usaba de forma puntual
  para stock de un ítem — `lib/api/catalog/items.ts` se refactorizó
  para reusar este hook en `useItemStockAcrossWarehouses` en lugar de
  duplicar la composición.
- **Aislamiento de datos de prueba E2E** (decisión de arquitectura
  aprobada explícitamente): "Empresa E2E" y "Sucursal E2E" con UUID fijo
  sembradas en `prisma/seed.ts`; script standalone
  `prisma/reset-e2e-company.ts` (`npm run reset:e2e`) que vacía
  exclusivamente los datos de negocio de esa empresa por `companyId` en
  orden seguro para las FK — nunca por coincidencia de texto, nunca
  toca otras empresas ni datos reales; `globalSetup` de Playwright lo
  ejecuta antes de cada corrida completa de la suite. `helpers.ts`
  ahora selecciona esta empresa por nombre exacto al iniciar sesión en
  vez de tomar la primera de la lista (ambiguo una vez que conviven
  varias empresas en la base de desarrollo).
- Tests: componente (`WarehousesTable` — controles ocultos sin rol de
  gestión, desactivar con confirmación, link al detalle) y E2E dedicado
  (crear depósito → ajustar stock → rechazo de salida sin stock
  suficiente → consultar por producto/depósito → transferir →
  persistencia tras recargar).

### Corregido

- `invitations-table.tsx` y la sección Sucursales de
  `configuracion/empresa` pasaban `emptyAction` a `DataTable` además
  del botón siempre visible del encabezado, duplicando el botón "+"
  cuando la lista estaba vacía. Nunca se manifestó con la empresa
  piloto (siempre tenía datos acumulados de sesiones previas); lo
  expuso la nueva Empresa E2E, vacía en cada corrida. Se quitó el
  `emptyAction` redundante en ambos lugares.
- `auth.spec.ts` predataba los helpers `gotoAndSettle`/
  `submitWithHydrationRetry` (creados durante F1-F3) y usaba
  `page.goto` + fill/click directo, quedando expuesto a la misma
  carrera de hidratación que esos helpers existen para evitar —
  especialmente grave al ser el primer spec en tocar un servidor de
  desarrollo recién levantado. Reescrito para usar los helpers
  compartidos.
- `useWarehouse`/`useUpdateWarehouse`/`useActivateWarehouse`/
  `useDeactivateWarehouse` asumían inicialmente un endpoint
  `companies/:id/warehouses/:warehouseId` que no existe:
  `WarehousesController` requiere `branchId` en el path para **todas**
  sus rutas. Corregido antes de manual testing (no llegó a producción):
  se eliminó `useWarehouse` (el detalle busca en `useAllWarehouses`,
  igual que el resto de los GET-por-id inexistentes del proyecto) y los
  demás hooks pasaron a requerir `branchId` explícito.

### Conocido / diferido

- El trigger de los `Select` dinámicos (depósito, sucursal, ítem)
  puede mostrar el valor crudo en vez de la etiqueta resuelta
  inmediatamente después de seleccionar una opción, en ciertos casos de
  timing de `@base-ui/react/select`. Es puramente cosmético — no afecta
  el envío de datos ni las tablas/detalles, que siempre muestran la
  etiqueta correcta — y preexiste desde F1 en el wrapper compartido
  `components/ui/select.tsx`; no se corrigió en F4 para no arriesgar
  regresiones en formularios de F1-F3 sin tiempo dedicado a probarlos.

## [1.2.0] - 2026-07-30

Extensión del módulo `catalog` (Sprint 3) pedida durante el diseño del
Sprint F3 del frontend, decidida explícitamente con el usuario: agregar
código de barras, costo y descripción larga a `Item`, más importación y
exportación CSV — mismo criterio que la extensión `GET /auth/me` durante
F1 (backend evoluciona cuando el frontend detecta una necesidad real, no
se rediseña de antemano).

### Agregado

- `Item.barcode` (string, único por empresa junto con `companyId` —
  múltiples ítems sin código de barras conviven sin problema, Postgres no
  aplica unicidad sobre `NULL`), `Item.costPrice` (`Decimal(14,2)`,
  costo/precio de referencia asignable directamente en el ítem — distinto
  de `Stock.averageCost`, que es un promedio *calculado* por movimientos
  y vive en `inventory`), `Item.longDescription` (texto libre, sin límite
  de formato, complementa a `description` que queda como resumen corto).
- `DuplicateBarcodeError`, `InvalidCostPriceError` — mismo patrón que
  `DuplicateSkuError`/validaciones existentes; validados en
  `Create/UpdateItemUseCase`.
- `POST /companies/:id/items/import`: importación CSV de ítems
  reutilizando `CsvImportEngine` (motor genérico ya construido en F2).
  Deduplica por `sku`. Deliberadamente fuera de alcance en esta primera
  versión: `categoryId`/`taxIds` por CSV (el usuario no maneja esos ids
  de memoria; se asignan luego desde la UI).
- `GET /companies/:id/items/export`: **primera exportación CSV del
  backend** (hasta ahora solo existía el sentido inverso). Respeta los
  mismos filtros que el listado (`type`, `categoryId`, `isActive`,
  `search`) para exportar exactamente lo que el usuario está viendo.
  Serializador propio sin dependencias nuevas (`common/application/csv-
  writer.ts`), mismo criterio que el generador de `uuidv7` — no sumar un
  paquete para una sola necesidad puntual.
- 13 tests unitarios nuevos (validación de costo/código de barras
  duplicado, `ItemImportRowProcessor`, `ImportItemsUseCase`,
  `ExportItemsUseCase`) — 373/373 tests totales.

## [web-0.5.0] - 2026-07-30

**Frontend Sprint F3 — Catálogo de Productos y Servicios.** Tercer
módulo de negocio (`docs/frontend/06-sprint-f3-catalogo.md`): mapea el
módulo `catalog` del backend (Categorías, Ítems Producto/Servicio,
Impuestos, Listas de precio). Escalado a decisión de arquitectura antes
de implementar (`AskUserQuestion`): se extendió `Item` en el backend
(código de barras, costo, descripción larga — ver `v1.2.0`), se
implementó importación **y** exportación CSV, y "integración con Stock"
se acotó a mostrar el stock actual en el detalle del ítem componiendo
endpoints ya existentes de `inventory` — sin construir pantallas de
Stock/Comprobantes, que siguen siendo F4/F5.

### Agregado

- **Pantalla Categorías** (`/catalogo/categorias`): árbol autorecursivo
  (`CategoryTree`) construido en el cliente a partir del array plano
  `Category[]`, alta/edición/subcategoría en `Sheet`, activar/desactivar.
  El selector de categoría padre excluye la propia categoría y todos sus
  descendientes para no ofrecer un ciclo que el backend rechazaría
  (RN-CAT-03).
- **Pantallas Productos/Servicios** (`/catalogo/productos`,
  `/catalogo/servicios`): misma pantalla filtrada por `type` — listado
  compartido (`ItemsPageContent`) y detalle compartido
  (`ItemDetailContent`), evitando duplicar ~90% de JSX idéntico entre
  ambas. Listado con búsqueda, filtro por estado, exportar CSV e importar
  CSV (reutiliza `ImportDialog`/`CsvImportEngine` de F2). Alta/edición en
  `ItemSheet`: SKU, nombre, código de barras, categoría, unidad de
  medida, descripción corta/larga, costo, controla stock (solo
  Productos, RN-CAT-07), stock mínimo, impuestos (multi-selección).
- **Detalle de ítem**: datos + panel de "Stock actual"
  (`ItemStockPanel`), visible solo si `tracksStock`. Sin endpoint nuevo:
  `useItemStockAcrossWarehouses` compone `GET .../branches`, `GET
  .../branches/:id/warehouses` y `GET .../warehouses/:id/stock?itemId=`
  en dos etapas paralelas con `useQueries` (sucursales → depósitos por
  sucursal → stock por depósito), decisión explícita para no ampliar el
  alcance del sprint con un endpoint agregado de inventario.
- **Pantalla Impuestos** (`/catalogo/impuestos`): alta con tipo (IVA/
  Percepción/Retención) y tasa; edición limitada al nombre (tasa y
  vigencia son inmutables por RN-CAT-10 — "editar" una tasa es cerrarla
  y crear una nueva); "Cerrar vigencia" solo se ofrece sobre impuestos
  actualmente vigentes.
- **Pantalla Listas de precio** (`/catalogo/listas-de-precio` +
  detalle): CRUD de listas (nombre, moneda, predeterminada) +
  `PriceListItemsTable`, tabla editable inline de precios por ítem
  (agregar ítem a la lista, editar precio con guardado en blur/Enter,
  quitar). El detalle no llama a un GET-por-id inexistente: busca la
  lista en el listado ya cacheado por `usePriceLists`.
- **Layout Catálogo**: tabs Productos/Servicios/Categorías/Impuestos/
  Listas de precio, ítem de sidebar "Catálogo" con `href` real
  (reservado sin enlace desde F0). `SidebarNav` unifica el resaltado de
  ítem activo (antes especial para "Configuración") en un único
  `isNavItemActive` por primer segmento de ruta.
- `lib/api/catalog/{categories,items,taxes,price-lists}.ts`, componente
  `Checkbox` (shadcn/ui) para `tracksStock`/impuestos/`isDefault`.
- Tests: componente (`CategoryTree` — árbol anidado, controles ocultos
  sin rol de gestión, desactivar con confirmación, mensaje vacío;
  `ItemsTable` — mismos casos + link al detalle según `basePath`) y E2E
  dedicado (crear categoría → ítem con esa categoría e impuesto →
  agregarlo a una lista de precios → importar un CSV de ítems).

### Corregido

- `ItemSheet` enviaba `type` también al **editar** un ítem — el backend
  rechaza esa propiedad en el PATCH con 400 ("property type should not
  exist") porque el tipo es inmutable tras crear (RN-CAT-06). Se
  encontró en verificación manual (el 400 no rompía la UI de forma
  visible: el `Sheet` simplemente no se cerraba). Fix: el payload de
  edición ya no incluye `type`; solo se agrega al crear.

## [web-0.4.0] - 2026-07-30

**Frontend Sprint F2 — Clientes y Proveedores.** Segundo módulo de
negocio (`docs/frontend/05-sprint-f2-clientes-proveedores.md`): mapea los
módulos `customers`/`suppliers` del backend (modelo `Party` compartido +
rol). Entregable cumplido — alta, edición, baja e importación de
clientes y proveedores — con prueba E2E dedicada (crear cliente, importar
CSV de proveedores, desactivar uno y verificar que queda inactivo).

### Agregado

- **Pantallas Clientes/Proveedores** (`/[companyId]/clientes`,
  `/[companyId]/proveedores`): listado con búsqueda (cliente, vía
  `DataTable`) y filtro por estado (servidor, vía la URL), alta/edición en
  panel lateral (`Sheet`), activar/desactivar sin motivo (a diferencia de
  Empresa/Sucursal). A diferencia de "Usuarios" en F1, la sección es
  visible para **cualquier miembro** — solo los controles de mutación se
  ocultan según `ROLES_THAT_CAN_MANAGE_COMPANY`, reflejando que el
  backend abre la lectura a todos.
- **Detalle de Cliente/Proveedor** (`/clientes/[customerId]`,
  `/proveedores/[supplierId]`): datos de solo lectura + cuenta corriente
  embebida (`CurrentAccountPanel`: saldo actual + tabla de movimientos,
  endpoint de `treasury` mostrado acá por decisión de UX del plan) +
  botón "Editar" que abre el mismo `Sheet` que "+ Nuevo".
- **Importación CSV** (`ImportDialog`, compartido entre ambas entidades):
  lectura del archivo en el cliente (`File.text()`, el backend recibe
  `csvContent` como texto plano en JSON, no `multipart/form-data`),
  selector de modo (`skip-new-only`/`update-existing`/`skip-silently`) y
  resumen de resultado (creados/actualizados/omitidos/rechazados con
  motivo).
- **Componentes compartidos** `components/parties/`: `PartyFormFields`
  (fragmento de campos comunes del `Party`), `CurrentAccountPanel`,
  `ImportDialog` — reutilizados por Clientes y Proveedores sin duplicar
  JSX, mientras que tablas y formularios completos quedan concretos
  (mismo criterio que `MembersTable`/`InvitationsTable` en F1).
- `lib/api/customers.ts`, `lib/api/suppliers.ts`, `lib/api/import.ts`
  (tipos `ImportMode`/`ImportSummary` compartidos).
- Ítems de sidebar "Clientes"/"Proveedores" (reservados sin `href` desde
  F0) ahora enlazan a sus pantallas reales.
- Tests: componente (`CustomersTable` — controles de mutación ocultos sin
  rol de gestión, desactivar con confirmación, editar) y E2E (crear
  cliente → importar CSV de proveedores → desactivar uno → verificar
  inactivo, sin afectar al resto).

### Corregido

- `apiFetch`/`ApiError` (`lib/api/http-client.ts`) mostraba "Ocurrió un
  error inesperado" en vez del motivo real cuando `ValidationPipe` de
  Nest rechazaba más de un campo a la vez — su `message` llega como
  array de strings, no como string, y la extracción original solo
  contemplaba el segundo caso. Afectaba a cualquier formulario, no solo a
  los nuevos de F2.
- `CustomerSheet`/`SupplierSheet`/`CompanyForm`: los campos opcionales
  vacíos (ej. "Correo" sin completar) se enviaban como `''` en vez de
  omitirse, y `@IsOptional() @IsEmail()` de `class-validator` **no**
  trata `''` como "no informado" — el backend rechazaba altas/ediciones
  válidas que dejaban un campo opcional en blanco. Se agrega
  `omitEmptyStrings` (`lib/utils.ts`) y se aplica antes de cada submit.
- `SidebarNav`: el resaltado de ítem activo comparaba con igualdad
  estricta de ruta: al entrar al detalle de un cliente/proveedor
  (`/clientes/[id]`), "Clientes" dejaba de verse resaltado. Ahora también
  compara por prefijo, igual que ya hacía "Configuración".

## [web-0.3.0] - 2026-07-29

**Frontend Sprint F1 — Configuración.** Primer módulo de negocio del
frontend (`docs/frontend/04-sprint-f1-configuracion.md`): administrar la
empresa y su equipo de punta a punta. Entregable cumplido — invitar a un
usuario, aceptar la invitación y verlo listado como miembro activo — con
prueba E2E dedicada.

### Agregado

- **Pantalla Empresa** (`/[companyId]/configuracion/empresa`): edición de
  datos generales/contacto/configuración regional y CRUD de sucursales
  (activar/desactivar exige motivo, RN-003).
- **Pantalla Usuarios** (`/[companyId]/configuracion/usuarios`), oculta
  para roles sin permiso de gestión (fail-closed): tabs Miembros (cambio
  de rol, activar/desactivar; la propia fila nunca ofrece autogestión,
  RN-USR-12) e Invitaciones (crear con copia de link de un solo uso,
  listar, revocar).
- **Pantalla pública de aceptar invitación**
  (`/invitaciones/[token]`): formulario de alta (nombre completo +
  contraseña) para el usuario invitado, sin sesión previa.
- **Componentes compartidos** reutilizables por el resto de sprints:
  `DataTable` (TanStack Table, búsqueda sincronizada con la URL, variante
  de tarjetas en móvil), `StatusBadge`, `ConfirmDialog` (con motivo
  opcional obligatorio).
- **Integración de `GET /auth/me`** (ver `[1.1.0]` más abajo): al montar
  cada empresa, `AppShell` reconstruye identidad y membresía contra el
  backend y bloquea el render hasta tenerlas — reemplaza el lookup
  client-side contra la lista de miembros que se perdía en cada F5.
  `useSessionStore` gana `membership`/`membershipCompanyId`;
  `useCurrentMembership` pasa a leer del store en vez de buscar la fila
  propia en `useMembers`.
- Tests: componente (`MembersTable` — autogestión bloqueada, desactivar
  con confirmación) y E2E (F5 en Configuración > Usuarios preserva los
  permisos de admin; invitar → aceptar → listado como miembro activo).

## [1.1.0] - 2026-07-29

Endpoint nuevo pedido durante el desarrollo del Sprint F1 del frontend
(`docs/frontend/04-sprint-f1-configuracion.md` §2.1, addendum): el
frontend necesitaba una forma de reconstruir la sesión (usuario + rol en
la empresa activa) al recargar la página, sin depender de estado
guardado en el navegador. El backend sigue siendo la única fuente de
verdad para autenticación y permisos.

### Agregado

- `GET /auth/me`: requiere JWT (no es público, a diferencia del resto de
  `AuthController`). Devuelve `{ id, email, fullName, membership }`.
  `membership` es `null` sin el header `X-Company-Id`; con él, resuelve
  `{ companyId, roleId, roleName, isActive }` de la membresía del usuario
  en esa empresa (o `null` si no es miembro) vía
  `CompanyUserRepository.findMembershipWithRoleName` — mismo lookup que
  ya usaba `CompanyContextGuard` internamente, ahora expuesto en el
  response.
- `CompanyUserRepository.findMembershipWithRoleName`: como
  `findMembership`, pero además resuelve el nombre del rol (join contra
  `Role`).

## [web-0.2.0] - 2026-07-28

**Frontend Sprint F0 — Fundación.** Primer sprint de frontend versionado
(`docs/frontend/03-plan-de-implementacion.md`): sin pantallas de negocio
todavía, pero con toda la base sobre la que se construyen F1-F8. Cierra
con login, selector de empresa, AppShell y logout funcionando de punta a
punta contra el backend real (Backend v1.0.1).

### Agregado

- **UI**: Tailwind CSS v4 + shadcn/ui (estilo `base-nova` sobre
  `@base-ui/react`), reskineado con la paleta "libro contable" existente
  (`--ink`, `--paper`, `--ledger-green`, etc.) en vez de aceptar el tema
  gris por defecto.
- **`packages/shared-types`**: tipos TypeScript generados desde el
  OpenAPI del backend (`openapi-typescript`), sin tipos escritos a mano.
- **BFF**: Route Handlers de Next.js (`/api/auth/*`, `/api/backend/*`)
  que hacen de intermediario con el backend — el JWT vive únicamente en
  cookies `httpOnly`/`sameSite=lax`, nunca en el navegador. Renovación de
  sesión transparente: un 401 por access token vencido dispara una
  rotación de tokens y un reintento automático antes de que el llamador
  lo note.
- **Estado**: TanStack Query para datos de servidor (`apiFetch<T>` +
  `ApiError` tipado), Zustand para sesión y preferencias de UI
  (`useSessionStore`, `useUiStore`).
- **Flujo de autenticación completo**: login (React Hook Form + Zod),
  selector de empresa (se salta automáticamente si el usuario tiene una
  sola empresa asignada), logout, y guardas que redirigen a `/login`
  ante cualquier acceso sin sesión válida.
- **AppShell**: sidebar con los 9 módulos de negocio (placeholders
  "próximamente" hasta F1-F8) + Configuración, topbar con
  `CompanySwitcher` y menú de usuario, responsive completo (sidebar fijo
  en escritorio, colapsable a íconos, menú móvil en `<640px`).
- Tests: Vitest + Testing Library para el formulario de login, Playwright
  para los 4 escenarios de e2e del sprint (login exitoso, login fallido,
  logout, acceso sin sesión).

### Corregido

- `components/ui/input.tsx` y `button.tsx` (shadcn) no forwardeaban el
  `ref` — rompía React Hook Form y cualquier composición vía
  `render={<Button/>}` bajo React 18. Envueltos en `React.forwardRef`.
- `DropdownMenuLabel` sin un `DropdownMenuGroup` padre hacía crashear el
  menú de usuario (Base UI exige ese contexto para `MenuGroupLabel`).

## [1.0.1] - 2026-07-27

Documentación completa de la API (Swagger/OpenAPI), primer entregable de
la preparación del frontend. Sin cambios de comportamiento.

### Agregado

- Plugin oficial `@nestjs/swagger` habilitado en `nest-cli.json`: infiere
  en tiempo de compilación el esquema de cada DTO (tipos, opcional/
  requerido, enums y validaciones vía `classValidatorShim`) sin necesidad
  de mantener `@ApiProperty` a mano en cada campo — evita que la
  documentación quede desactualizada respecto del código.
- `@ApiOperation` con resumen (y descripción cuando el comportamiento no
  es obvio) en los 91 endpoints de los 29 controllers del backend.
- `@ApiBearerAuth()` en los 27 controllers protegidos por JWT; los 2
  únicos endpoints públicos (`/auth/*`, `/invitations/:token`) quedan sin
  el candado en la UI de Swagger, reflejando la realidad.
- Verificado sirviendo la API real: `/api/docs` (Swagger UI) y
  `/api/docs-json` (spec OpenAPI) exponen 91 rutas y 51 esquemas
  completos.

## [1.0.0] - 2026-07-27

**Backend MVP — versión congelada.** Cierra Sprints 0 a 4 como la primera
versión estable del backend de Estrategos Gestión 360: un ERP
administrativo y financiero multi-tenant completo de punta a punta, sin
huecos funcionales en su núcleo. A partir de aquí el trabajo continúa con
la documentación e implementación del frontend (`docs/frontend/`); nuevos
cambios de backend versionarán como `1.x.0` (funcionalidad) o `1.0.x`
(correcciones/documentación) según corresponda.

### Alcance congelado (Sprints 0-4, v0.1.0 → v0.10.0)

- **Núcleo** (Sprint 0-1): autenticación JWT con refresh rotable, tenants,
  empresas multi-tenant con aislamiento por `companyId`, sucursales,
  usuarios con rol por empresa, invitaciones, auditoría inmutable
  (RN-009), Unit of Work transaccional.
- **Terceros** (Sprint 2): clientes y proveedores sobre un modelo `Party`
  compartido, importación masiva por CSV.
- **Catálogo** (Sprint 3.1): categorías jerárquicas, ítems (producto/
  servicio), impuestos con vigencia, listas de precios.
- **Stock** (Sprint 3.2): depósitos, stock por ítem+depósito, movimientos
  con ajustes y transferencias, costeo por promedio ponderado.
- **Comprobantes** (Sprint 3.3): motor de numeración fiscal, Facturas A/B/C
  y Notas de Crédito de venta, Factura de Compra, snapshot de precios e
  impuestos, efectos automáticos sobre stock.
- **Tesorería** (Sprint 3.4): medios de pago (efectivo, cheque, tarjetas,
  transferencia), cobros/pagos con imputación a comprobantes, cuentas
  corrientes de clientes y proveedores.
- **Caja y Bancos** (Sprint 3.5): cajas por sucursal con sesiones y cierre
  con saldo esperado/diferencia, cuentas bancarias y sus movimientos.
- **Contabilidad** (Sprint 4): Plan de Cuentas por empresa, asientos de
  doble entrada automáticos (desde Voucher/Payment) y manuales, Libro
  Diario y Libro Mayor, opt-in por empresa.

### Estado verificado al momento del freeze

- 355 tests unitarios + 24 de integración contra Postgres real, todos
  verdes. `tsc --noEmit`, `eslint` y `nest build` sin errores en ningún
  punto del historial de sprints.
- Documentación de arquitectura completa en `docs/ARQUITECTURA.md` y
  `docs/sprint-*/`, con cada decisión relevante (multi-tenancy, UUID v7,
  Unit of Work, RLS diferido, convención de signos de cuenta corriente,
  mapeo contable, etc.) documentada y aprobada explícitamente antes de
  implementarse.

## [0.10.0] - 2026-07-27

Sprint 4: Contabilidad (Plan de Cuentas y Asientos). Cierra el núcleo
financiero completo con un motor de asientos contables de doble entrada,
opcional por empresa (`docs/sprint-4/00-arquitectura-contabilidad.md`).
Decisiones 2.3 (el asiento se dispara desde `Voucher`/`Payment`, no desde
`CashMovement`/`BankMovement`) y 2.4 (mapeo contable distribuido en las
entidades existentes + `AccountingSettings`) aprobadas explícitamente.

### Agregado

- **Plan de Cuentas** (`ChartOfAccount`, por empresa, jerárquico): al
  activar Contabilidad (`POST /companies/:id/accounting-settings/activate`)
  se clona una plantilla estándar argentina de 18 cuentas (Activo/Pasivo/
  Patrimonio Neto/Ingresos/Egresos) y se crea `AccountingSettings` con las
  cuentas de control (Deudores por Ventas, Proveedores). Solo las cuentas
  hoja (`allowsMovements`) reciben movimientos; las de sistema
  (`isSystemAccount`) no pueden desactivarse. `/companies/:id/chart-of-accounts`.
- **Asientos contables** (`JournalEntry`/`JournalEntryLine`): motor único
  (`ApplyJournalEntryService`) que valida balanceo Debe=Haber y que cada
  cuenta sea imputable antes de persistir. Inmutables — la corrección es
  un asiento de reversión (`POST /journal-entries/:id/reverse`), nunca una
  edición. Soportan asientos automáticos (`origin: AUTOMATIC`, disparados
  desde `Voucher`/`Payment`) y manuales (`origin: MANUAL`,
  `POST /companies/:id/journal-entries`). Libro Diario
  (`GET /companies/:id/journal-entries`) y Libro Mayor con saldo
  acumulado (`GET /companies/:id/chart-of-accounts/:id/ledger`).
- **Mapeo contable opt-in**: `Category.salesAccountId`/`purchasesAccountId`,
  `Tax.salesAccountId`/`purchasesAccountId`, `CashRegister.accountId`,
  `BankAccount.glAccountId`, y `CompanyPaymentMethodAccount` (tabla puente
  para medios de pago que no mueven caja ni banco, ej. Cheque, mapeados
  por empresa + medio + sentido). Contabilidad es opcional por empresa: sin
  `AccountingSettings`, el comportamiento es idéntico al de antes de este
  sprint.
- **Retrofit `CreateVoucherUseCase`**: con Contabilidad activa, confirmar
  un comprobante genera un asiento balanceado (Deudores/Proveedores contra
  Ventas/Compras + IVA, agrupado por cuenta); rechaza si falta el mapeo de
  la categoría del ítem o del impuesto (RN-ACC-05).
- **Retrofit `CreatePaymentUseCase`**: confirmar un cobro/pago genera un
  asiento balanceado (Deudores/Proveedores contra Caja/Banco/otros medios,
  agrupado por cuenta); rechaza si falta el mapeo de la caja, la cuenta
  bancaria o el medio de pago usado.
- **Retrofit `CreateCashMovementUseCase`/`CreateBankMovementUseCase`**: los
  movimientos manuales exigen además `counterpartAccountId` cuando
  Contabilidad está activa y generan su propio asiento manual.

### Hallazgos durante la implementación (documentados en §9 del doc de diseño)

- `PaymentMethod` es un catálogo global pero `ChartOfAccount` es por
  empresa: resuelto con la tabla puente `CompanyPaymentMethodAccount` en
  vez de una FK directa.
- El mismo medio de pago necesita cuentas distintas según el sentido
  (`CHEQUE` recibido es activo, `CHEQUE` entregado es pasivo): se agregó
  `direction` a la clave de `CompanyPaymentMethodAccount` (migración
  adicional sobre una tabla todavía vacía).
- La exención inicialmente planteada para `CUENTA_CORRIENTE` (medio sin
  cuenta mapeada) dejaba asientos desbalanceados en pagos mixtos; se
  corrigió exigiendo mapeo a todo medio sin `CashMovement`/`BankMovement`,
  sin excepciones.

### Pruebas

- 355/355 tests unitarios (59 nuevos de este sprint).
- 24/24 tests de integración contra Postgres real (3 nuevos: camino feliz
  Factura+Cobro con asientos balanceados y Libro Mayor correcto, rollback
  sin asiento huérfano, rechazo por mapeo faltante).
- `tsc --noEmit`, `eslint` y `nest build` sin errores.
- Regresión end-to-end manual con `curl`: activación de Contabilidad,
  Plan de Cuentas clonado, mapeo de cuentas, Factura de Venta con asiento
  de 3 líneas balanceado, Cobro con asiento de 2 líneas balanceado, Libro
  Mayor con saldo acumulado correcto, asiento manual + reversión, y
  rechazo de asiento desbalanceado / doble reversión.

## [0.9.0] - 2026-07-27

Sprint 3, Sub-sprint 5: Caja y Bancos. Quinto y último sub-sprint del
núcleo financiero, según `docs/sprint-3/00-arquitectura-nucleo-financiero.md`
§11-12 (Decisión 11.2: caja por sucursal con sesiones por turno). Cierra
el plan completo de Sprint 3 (§18).

### Agregado

- **Caja** (`CashRegister` + `CashSession` + `CashMovement`): una o más
  cajas físicas por sucursal, cada una con a lo sumo una sesión abierta a
  la vez. Al cerrar una sesión se calculan y guardan `expectedBalance`
  (saldo esperado según los movimientos) y `difference` (contra el
  `closingBalance` informado). `/companies/:id/branches/:branchId/cash-registers`,
  `/companies/:id/cash-sessions/:id`.
- **Bancos** (`BankAccount` + `BankMovement`): cuentas bancarias propias
  de la empresa con sus movimientos (depósito/extracción).
  `isReconciled` queda siempre `false` — sin lógica de conciliación en
  este sub-sprint. `/companies/:id/bank-accounts`.
- **`Payment` ahora genera `CashMovement`/`BankMovement`** (cierre de
  Sprint 3.4): un cobro/pago en Efectivo exige `cashSessionId` (sesión
  abierta) y genera un `CashMovement`; uno en Transferencia/Tarjeta exige
  `bankAccountId` (cuenta activa) y genera un `BankMovement` — ambos en
  la misma transacción que crea el pago.
- **Movimientos manuales de caja/banco**: además de los automáticos
  desde un `Payment`, se pueden registrar movimientos manuales (aporte
  del dueño, gasto bancario) con motivo/descripción obligatorios.
- **`ApplyCashMovementService`/`ApplyBankMovementService`**: mismo
  principio que `ApplyStockMovementService`/
  `ApplyCustomerAccountMovementService` — reciben la transacción abierta
  para poder combinarse atómicamente con la creación del `Payment`.

### Corregido

- **Bug real de `decimal.js`**: `Decimal.isPositive()` considera `0`
  como positivo (solo excluye negativos), no "estrictamente > 0". Afectaba
  la validación de montos en `CreatePaymentUseCase`/
  `CreateCashMovementUseCase`/`CreateBankMovementUseCase` (código nuevo de
  este sub-sprint) y, retroactivamente, una cantidad de línea en `0` en
  `CreateVoucherUseCase` (Sprint 3.3) que no se rechazaba. Corregido
  usando `.greaterThan(0)` en los 4 lugares; detectado por la suite de
  tests unitarios, no por `tsc`/`eslint`.

### Pruebas

- 296/296 tests unitarios (41 nuevos de este sub-sprint).
- 21/21 tests de integración contra Postgres real (3 nuevos: camino feliz
  de `CashSession` con `expectedBalance` exacto, rollback de apertura,
  RN-CASH-02).
- `tsc --noEmit`, `eslint` y `nest build` sin errores.
- Regresión end-to-end manual con `curl`: alta de caja y cuenta bancaria,
  apertura de sesión, Factura de Venta, cobro parcial en efectivo
  (`CashMovement` verificado), cobro del resto por transferencia
  (`BankMovement` verificado), movimiento manual con motivo, cierre de
  sesión con `expectedBalance` exacto ($600, `difference` = 0), y rechazo
  de un cobro en efectivo sin sesión de caja indicada.

## [0.8.0] - 2026-07-27

Sprint 3, Sub-sprint 4: Tesorería (Pagos y Cuentas Corrientes). Cuarto
módulo del núcleo financiero, según
`docs/sprint-3/00-arquitectura-nucleo-financiero.md` §1.7, 1.8, 13-15
(incluye la Decisión 1.7: cuentas separadas Cliente/Proveedor).

### Agregado

- **Cuentas corrientes separadas** (`CustomerAccount`/`SupplierAccount` +
  sus `...Movement`): se materializan automáticamente en el primer
  movimiento (mismo patrón que `Stock`), con una convención de signo
  unificada entre ambas (saldo positivo = nos deben, negativo = les
  debemos). `GET /companies/:id/customers/:id/current-account`,
  `GET /companies/:id/suppliers/:id/current-account`.
- **`Voucher` ahora afecta la cuenta corriente**: retrofit de
  `CreateVoucherUseCase` (Sprint 3.3) — una Factura de Venta sube el saldo
  del cliente, una Factura de Compra baja el del proveedor, una Nota de
  Crédito revierte el efecto, todo dentro de la misma transacción que crea
  el comprobante.
- **Pagos y cobros** (`Payment` + `PaymentAllocation` +
  `PaymentMethodDetail`): un pago puede cubrir uno o varios comprobantes
  (total o parcialmente) y repartirse entre varios medios de pago a la
  vez. `POST/GET /companies/:id/payments`,
  `GET /companies/:id/payments/:id`.
- **Medios de pago** (`PaymentMethod`, catálogo global sembrado: Efectivo,
  Cheque, Transferencia, Tarjeta de Débito/Crédito, Cuenta Corriente), con
  `CheckDetail` (número, banco, fecha de cobro, estado) y `CardDetail`
  para los medios que lo requieren. `GET /payment-methods`.
- **`ApplyCustomerAccountMovementService`/`ApplySupplierAccountMovementService`**:
  mismo principio que `ApplyStockMovementService` (Sprint 3.3) — reciben
  la transacción abierta en vez de crear la suya propia, para que
  Comprobantes y Pagos puedan aplicar su efecto de cuenta corriente
  atómicamente junto con el resto de sus escrituras.

### Corregido / actualizado

- `VoucherType` gana la columna `affectsCurrentAccount`
  (`DEBIT`/`CREDIT`/`NONE`), completada retroactivamente en los 7 tipos ya
  sembrados según su `flow`/`isCreditNote`.

### Pruebas

- 255/255 tests unitarios (23 nuevos: 21 de Tesorería + 2 del retrofit de
  `CreateVoucherUseCase`).
- 18/18 tests de integración contra Postgres real (3 nuevos: camino feliz
  Factura→cobro parcial, pago con Cheque, rollback).
- `tsc --noEmit`, `eslint` y `nest build` sin errores.
- Regresión end-to-end manual con `curl`: Factura de Venta, cobro parcial,
  cobro del resto combinando dos medios, Factura de Compra, pago a
  proveedor con cheque, y rechazo de sobre-imputación — saldos verificados
  exactos en cada paso. Se detectó y corrigió un bug real durante esta
  verificación (ver `docs/sprint-3/04-tesoreria.md` §7, hallazgo 2): un
  error de Prisma al mezclar escritura por FK escalar con escritura
  anidada por relación al crear `PaymentMethodDetail` con `CheckDetail`.

## [0.7.0] - 2026-07-27

Sprint 3, Sub-sprint 3: Comprobantes (Facturas y Notas de Crédito, Venta y
Compra unificadas). Tercer módulo del núcleo financiero, según
`docs/sprint-3/00-arquitectura-nucleo-financiero.md` §1.3-1.5, 8-10.

### Agregado

- **Puntos de venta (`PointOfSale`)**: uno o más por sucursal, código
  único por empresa (identificador fiscal AFIP).
  `/companies/:id/branches/:branchId/points-of-sale`.
- **Comprobantes (`Voucher`)**: modelo polimórfico único para Ventas y
  Compras — Factura A/B/C, Nota de Crédito A/B/C y Factura de Compra (7
  tipos, catálogo global `VoucherType` sembrado). Crear = confirmar en una
  sola operación (sin borrador, sin anulación directa — la reversión es
  siempre vía Nota de Crédito referenciando el original, RN-VOU-03).
  `/companies/:id/vouchers`, `GET /voucher-types`.
- **Numeración fiscal atómica y sin huecos** (RN-VOU-02): contador
  (`VoucherCounter`) incrementado con una sola sentencia
  `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` dentro de la misma
  transacción que crea el comprobante — verificado con una prueba de
  concurrencia real (dos altas en paralelo, números consecutivos sin
  duplicados).
- **Snapshot de impuestos por línea** (RN-VOU-05): cada línea con ítem
  copia las tasas de los impuestos vigentes del `Item` al momento de
  confirmar (`VoucherLineTax`), sin volver a leer el catálogo después.
- **Efecto de stock automático** (RN-VOU-06/07): Factura de Venta
  descuenta, Factura de Compra ingresa, Nota de Crédito revierte — cada
  línea con ítem que trackea stock genera un `StockMovement` dentro de la
  misma transacción que el comprobante, vía el nuevo
  `ApplyStockMovementService`.
- **`ApplyStockMovementService`** (refactor de Sprint 3.2): extrae la
  lógica de costeo PPP y validación de stock negativo (antes duplicada
  en `CreateStockAdjustmentUseCase`/`CreateStockTransferUseCase`) a un
  servicio que recibe la transacción abierta en vez de crear la suya
  propia — necesario para que `CreateVoucherUseCase` pueda numerar, crear
  el comprobante y aplicar sus efectos de stock de forma atómica.

### Corregido / actualizado

- `CreateStockAdjustmentUseCase`/`CreateStockTransferUseCase` ahora
  delegan en `ApplyStockMovementService` en vez de reimplementar la
  fórmula de costeo — sin cambios de comportamiento observable.
- `StockMovement` gana la columna `voucherId` (diferida desde Sprint 3.2)
  para trazar qué comprobante originó cada movimiento.

### Pruebas

- 232/232 tests unitarios (29 nuevos de este módulo).
- 15/15 tests de integración contra Postgres real (3 nuevos: camino feliz,
  rollback, y concurrencia de numeración).
- `tsc --noEmit`, `eslint` y `nest build` sin errores.
- Regresión end-to-end manual con `curl`: Factura de Venta con snapshot de
  impuestos y stock descontado verificados, Nota de Crédito con stock y
  costo promedio repuestos correctamente, Factura de Compra con stock
  incrementado, y rechazo de comprobantes a una contraparte inactiva o sin
  el comprobante relacionado exigido.

## [0.6.0] - 2026-07-25

Sprint 3, Sub-sprint 2: Depósitos y Stock (Warehouse, Stock, StockMovement).
Segundo módulo del núcleo financiero, según
`docs/sprint-3/00-arquitectura-nucleo-financiero.md` §6-7.

### Agregado

- **Depósitos (`Warehouse`)**: uno o más por sucursal, nombre único dentro
  de la misma sucursal (RN-STK-02). `/companies/:id/branches/:branchId/warehouses`.
- **Stock materializado**: cantidad y costo promedio ponderado (PPP) por
  ítem/depósito, actualizado exclusivamente como efecto de un
  `StockMovement`, nunca escrito directamente (RN-STK-04).
  `GET /companies/:id/warehouses/:warehouseId/stock`.
- **Movimientos de stock**: ajustes manuales de entrada/salida
  (`POST .../stock-movements/adjustment`) y transferencias entre depósitos
  (`POST /companies/:id/stock-transfers`, genera un par
  `TRANSFER_OUT`/`TRANSFER_IN` atómico con el mismo `transferGroupId`).
  Bloqueo de stock negativo configurable por empresa
  (`Company.allowNegativeStock`, RN-STK-06). Kardex consultable con
  `GET .../stock-movements`.
- **UUID v7** para `StockMovement` (primera tabla de alto volumen del
  sistema): generador propio sin dependencias
  (`common/infrastructure/id/uuid-v7.ts`), según la Decisión 1.1 del
  documento de arquitectura.
- **34 tests unitarios + 4 tests de integración de rollback real** contra
  Postgres (ajuste de stock, transferencia entre depósitos).

### Corregido / actualizado

- `CompanyEntity` expone el nuevo campo `allowNegativeStock`.
- Se agregó `decimal.js` como dependencia directa para el cálculo de costo
  promedio ponderado — aritmética acumulativa que no debía hacerse con
  `Number` de JavaScript (riesgo de imprecisión de punto flotante).

### Pruebas

- 203/203 tests unitarios (34 nuevos + 169 heredados).
- 12/12 tests de integración contra Postgres real (4 nuevos).
- `tsc --noEmit`, `eslint` y `nest build` sin errores.
- Regresión end-to-end manual con `curl`: dos entradas de stock con
  recálculo de promedio ponderado verificado exacto ($150), salida sin
  motivo rechazada (RN-STK-07), salida que dejaría stock negativo
  rechazada (RN-STK-06), transferencia entre depósitos con costo
  transferido correcto, y kardex con IDs (UUID v7) ordenados
  temporalmente en la práctica.

## [0.5.0] - 2026-07-25

Sprint 3, Sub-sprint 1: Catálogo maestro (Categorías, Ítems, Impuestos,
Listas de precio). Primer módulo del núcleo financiero, según el plan de
`docs/sprint-3/00-arquitectura-nucleo-financiero.md` (documento de
arquitectura aprobado — ver también la Decisión 1.7: cuentas corrientes
separadas Cliente/Proveedor, que se aplicará en Sprint 3.4).

### Agregado

- **Categorías**: jerárquicas (lista de adyacencia, `parentId`
  autoreferenciado), con detección de ciclos (RN-CAT-03) y validación de
  que el padre pertenezca a la misma empresa (RN-CAT-02).
  `/companies/:id/categories`.
- **Ítems (Productos y Servicios unificados)**: entidad única con
  discriminador `type`, SKU único por empresa, impuestos asociados
  (`ItemTax`, muchos a muchos), y la regla de que un Servicio nunca controla
  stock aunque el request lo pida (RN-CAT-07) ni admite `minimumStock` sin
  `tracksStock` (RN-CAT-08). `/companies/:id/items`.
- **Impuestos**: catálogo flexible (IVA, Percepción, Retención) con
  vigencia (`validFrom`/`validTo`); la tasa es inmutable una vez creada —
  "cambiarla" es cerrar el impuesto (`POST .../close`) y crear uno nuevo,
  para no reescribir la historia de comprobantes que en Sprint 3.3 la usarán
  como snapshot. `/companies/:id/taxes`.
- **Listas de precios**: múltiples listas por empresa, precio neto (sin
  impuestos incluidos), a lo sumo una `isDefault=true` por empresa
  (RN-CAT-13, reforzado transaccionalmente). `/companies/:id/price-lists`,
  con precios por ítem anidados en `.../items/:itemId` (upsert con `PUT`,
  baja física permitida con `DELETE` — única excepción al "nunca se borra
  físicamente" del resto del sistema, porque no es un registro financiero).
- **24 casos de uso nuevos**, todos usando `UnitOfWork` desde el día 1 (a
  diferencia de Empresas/Clientes en Sprints 1/2, donde se agregó después).
- **57 tests unitarios + 2 tests de integración de rollback real** contra
  Postgres (`CreateItemUseCase` con `Item`+`ItemTax`+`AuditLog`;
  `CreatePriceListUseCase` con `isDefault` y desmarcado atómico de la lista
  anterior).

### Pruebas

- 169/169 tests unitarios (57 nuevos + 112 heredados).
- 8/8 tests de integración contra Postgres real, incluyendo los 2 nuevos.
- `tsc --noEmit`, `eslint` y `nest build` sin errores.
- Regresión end-to-end manual con `curl`: alta de Categoría/Impuesto/Ítem
  (Producto y Servicio, confirmando RN-CAT-07)/Lista de precios, SKU
  duplicado rechazado, fijar y listar precios, desactivar dos veces
  (RN-CAT-16), y exclusividad de `isDefault` entre dos listas (RN-CAT-13).

## [0.4.0] - 2026-07-24

Resolución de la Decisión A (transacciones, Crítico) y de la Decisión B
(Row Level Security, diseño) de `docs/AUDITORIA-TECNICA-PRE-SPRINT-3.md`.
Bloqueaba el inicio de Sprint 3 hasta quedar resuelta.

### Agregado

- **Infraestructura de Unit of Work** (`common/domain/transaction/`,
  `common/infrastructure/persistence/prisma-unit-of-work.ts`): abstracción
  única y reutilizable sobre `prisma.$transaction`, pensada para que todos
  los módulos futuros (Ventas, Compras, Tesorería, Inventario, Contabilidad)
  la reutilicen sin duplicar lógica. Diseño documentado en
  `docs/arquitectura/unit-of-work-y-transacciones.md`.
- **Los ~26 casos de uso que escriben en más de una tabla** (contando
  `AuditLog` como una tabla más) ahora abren una transacción real: alta,
  edición, activación/desactivación de Empresas, Sucursales, Clientes y
  Proveedores; alta/revocación/aceptación de invitaciones; cambio de rol y
  activación/desactivación de miembros; y adicionalmente — no estaban en el
  alcance original de la auditoría, pero comparten el mismo riesgo —
  `LoginUseCase` (RefreshToken + AuditLog + User) y `RefreshSessionUseCase`
  (revocar + emitir refresh token). Si cualquier paso falla, Postgres
  revierte todo: ya no puede quedar una `Company` sin su `CompanyUser`, un
  `Party` sin su rol de Cliente/Proveedor, ni una escritura sin su registro
  de auditoría.
- **Importación CSV**: cada fila se procesa dentro de su propia transacción
  (no el archivo completo), preservando el procesamiento best-effort por
  fila que exige RN-TER-10 mientras gana atomicidad interna por fila.
- **Infraestructura de tests de integración** contra Postgres real: base de
  datos dedicada `estrategos_test` (nunca la misma que `estrategos_dev`),
  configuración de Jest separada (`jest.integration.config.js`,
  `npm run test:integration`), y helper de limpieza entre tests
  (`test/support/reset-database.ts`).
- **4 pruebas de integración de rollback real** (`*.integration-spec.ts`
  para `CreateCompanyUseCase` y `CreateCustomerUseCase`): fuerzan una falla
  en la escritura de auditoría a mitad de la transacción y verifican,
  consultando Postgres directamente, que no queda ningún registro huérfano.
- **Diseño de Row Level Security** (Decisión B, opción B1 — junto con Unit
  of Work): `docs/arquitectura/row-level-security.md`. Documenta el
  mecanismo (políticas nativas de Postgres, variables de sesión
  `app.current_company_id`/`app.current_tenant_id`), el desafío de que RLS
  exige que *toda* consulta —no solo las multi-escritura— corra dentro de
  una transacción, el caso especial de `hasRoleInTenant` (consulta
  legítimamente cruzada entre empresas de un mismo tenant), y el plan de
  rollout incremental. Documentación únicamente — sin migraciones ni código
  de runtime, según lo acordado.

### Actualizado

- Los ~112 tests unitarios existentes, adaptados al nuevo patrón: cada spec
  mockea `UnitOfWork.run` ejecutando el callback con un `TransactionContext`
  falso, y verifica que cada repositorio se llama con ese mismo contexto.

### Pruebas

- 112/112 tests unitarios.
- 4/4 tests de integración contra Postgres real (`estrategos_test`),
  incluyendo verificación de rollback.
- `tsc --noEmit`, `eslint` y `nest build` sin errores.
- Regresión end-to-end manual con `curl`: login → refresh (rotación) →
  crear empresa → crear cliente → logout, contra Postgres real.

## [0.3.1] - 2026-07-23

Auditoría técnica integral pre-Sprint 3. Correcciones aplicadas sin decisión
de arquitectura pendiente; ver `docs/AUDITORIA-TECNICA-PRE-SPRINT-3.md` para
el informe completo, severidad de cada hallazgo, y las decisiones (RLS,
transacciones, bloqueo de login, upgrade de dependencias) que quedan
esperando aprobación antes de Sprint 3.

### Agregado

- **`POST /auth/logout`**: revoca el refresh token — M01 pedía "cierre de
  sesión" explícitamente y solo existía login/refresh hasta ahora.
- **Documentación de API (Swagger/OpenAPI)**: `GET /api/docs` (UI) y
  `GET /api/docs-json` (spec crudo) — entregable exigido por el documento
  fuente que faltaba desde Sprint 0.
- **`helmet`**: cabeceras de seguridad HTTP básicas.
- **Índices compuestos `(companyId, isActive)`** en `Branch`, `CompanyUser`,
  `Customer` y `Supplier` — el patrón de consulta más común del sistema no
  estaba cubierto por un índice.
- **`CHECK` constraint** en `customers.credit_limit >= 0` — defensa en
  profundidad a nivel de base de datos, además de la validación ya existente
  en el caso de uso.
- **19 tests unitarios nuevos**: `GetCompanyByIdUseCase`,
  `GetCustomerByIdUseCase`, `ListCustomersUseCase`, `GetSupplierByIdUseCase`,
  `ListSuppliersUseCase` (sin cobertura previa), `LogoutUseCase`, y
  `CsvParseAdapter` (el único punto del sistema que ejercita la librería
  `csv-parse` real en vez de un mock).

### Corregido

- `GlobalExceptionFilter` no traducía errores conocidos de Prisma (`P2002`
  conflicto de unicidad, `P2025` registro no encontrado) — una condición de
  carrera real podía devolver 500 genérico en vez de un 409/404 entendible.
- Código duplicado: función `pick()` idéntica en `UpdateCustomerUseCase` y
  `UpdateSupplierUseCase`, unificada en `common/application/pick.ts`.
- `verifyAccessToken` lanzaba `InvalidRefreshTokenError` (nombre incorrecto,
  copiado del método vecino) — ahora `InvalidAccessTokenError`.
- Comentario desactualizado en `CompanyContextGuard` que prometía Row Level
  Security "en Sprint 1" — nunca se cumplió; corregido para no repetir una
  promesa de fecha.

### Pendiente de decisión (no corregido, requiere aprobación — ver informe)

- **Crítico**: falta de transacciones de base de datos en operaciones
  multi-tabla (`CreateCompanyUseCase`, `CreateCustomerUseCase`/
  `CreateSupplierUseCase`, `AcceptInvitationUseCase`, importaciones CSV).
- **Alto**: Row Level Security de Postgres todavía no implementado.
- **Alto**: bloqueo por intentos fallidos de login todavía no implementado.
- **Medio**: NestJS/Prisma/TypeScript 1-2 versiones mayores atrasadas.

## [0.3.0] - 2026-07-23

Módulo 1 de Sprint 2 (Clientes y Proveedores / Terceros).

### Agregado

- **Modelo unificado de Personas (`Party`/Tercero)**: una misma persona
  física o jurídica puede ser Cliente y Proveedor de la misma empresa a la
  vez, sin duplicar razón social, CUIT, condición fiscal ni datos de
  contacto. Verificado con datos reales: crear un Cliente y luego un
  Proveedor con el mismo CUIT reutiliza el mismo registro compartido, sin
  pisar sus datos; desactivar el rol de Cliente no afecta el rol de
  Proveedor de la misma persona.
- **Clientes**: alta, edición, búsqueda, filtros, activación/desactivación,
  límite de crédito (primer campo `Decimal` real del sistema) y condición
  de pago (`/companies/:id/customers`).
- **Proveedores**: mismo CRUD que Clientes, con datos bancarios y condición
  de compra en vez de límite de crédito (`/companies/:id/suppliers`).
- **Motor de importación CSV reutilizable**: `CsvImportEngine` (agnóstico de
  entidad, en `common/`) con tres modos (solo agregar nuevos, actualizar
  existentes, omitir duplicados silenciosamente), procesamiento por fila
  (best-effort), reporte final y auditoría por fila + resumen. Reutilizado
  ahora por Clientes y Proveedores; queda listo para Productos, Servicios,
  Plan de cuentas, Bancos, Stock u otra entidad futura sin duplicar lógica.
- **Unicidad CUIT + empresa**: reforzada a nivel de base de datos
  (`@@unique([companyId, taxId])` en `Party`), no solo en el código.
- **Pruebas**: 93/93 tests (5 del motor genérico + 24 de Clientes/
  Proveedores + los 64 heredados de Sprints 0/1) y verificación end-to-end
  completa con `curl` contra Postgres real.

### Corregido

- Los nombres de acción de auditoría de la importación CSV
  (`customer.created`/`customer.updated`) no coincidían con los de las
  altas/ediciones manuales (`customer.create`/`customer.update`), lo que
  habría hecho que un filtro de auditoría por acción se perdiera las altas
  hechas por CSV. Unificado a un solo criterio de nombres.

### Decisión de escalabilidad

- `companyId` se mantiene duplicado en `Customer`/`Supplier` además de en
  `Party` (redundante pero seguro: nunca se edita independientemente) para
  sostener el patrón de columna directa indexada que usa todo el sistema y
  dejar el terreno listo para Row Level Security sin rediseñar nada. Ver
  `docs/sprint-2/01-clientes-proveedores.md` §0.5.

## [0.2.0] - 2026-07-23

Módulo 2 de Sprint 1 (Usuarios, Roles, Permisos e Invitaciones), aprobado con
observaciones.

### Agregado

- **Invitaciones**: alta, listado y revocación de invitaciones por empresa
  (`/companies/:id/invitations`), con token aleatorio hasheado (SHA-256, nunca
  en texto plano), vencimiento a 7 días, y un puerto `InvitationNotifierPort`
  desacoplado de cualquier proveedor de email (hoy no-op — SMTP/Gmail/
  Microsoft 365/SendGrid/SES se conectan después sin tocar la lógica de
  dominio).
- **Aceptación de invitación** (`GET/POST /invitations/:token`, público, sin
  sesión): crea el usuario si el email no existe o reutiliza la cuenta
  existente sin pisar su contraseña; asigna el rol de la invitación; primer
  acceso posterior queda auditado (`user.first_access`) en el login.
- **Roles y miembros**: catálogo de roles (`GET /roles`), listado de miembros
  de una empresa, cambio de rol (`PATCH .../members/:userId/role`) y
  activación/desactivación de acceso por empresa, todo con auditoría.
- **Multiempresa real confirmado**: un mismo usuario puede tener roles
  distintos en empresas distintas simultáneamente (verificado con datos
  reales, no solo por diseño).
- **Autorización 100% en backend**: ningún permiso depende del frontend; todo
  chequeo de rol ocurre en el caso de uso contra el rol que el backend
  resolvió desde la base de datos.
- **Auto-protección**: nadie puede cambiarse su propio rol ni desactivar su
  propio acceso a una empresa.
- **Pruebas**: 59/59 tests (11 nuevos del módulo + 2 nuevos de auditoría de
  primer acceso + los heredados de Empresas/Sucursales/Auth) y verificación
  end-to-end completa con `curl` contra Postgres real, incluyendo el flujo de
  invitación de punta a punta.

### Corregido

- `JwtAuthGuard` devolvía 500 en vez de 401 ante un token inválido o expirado
  (bug heredado de Sprint 0, nunca antes ejercitado end-to-end).
- Caché incremental de TypeScript (`tsconfig.build.tsbuildinfo`) podía dejar
  el build incompleto en silencio (exit 0) después de borrar `dist/` sin
  borrar también la caché — corregido de raíz desactivando `incremental` en
  `tsconfig.build.json`.

## [0.1.0] - 2026-07-23

Primera versión estable del proyecto. Incluye la base técnica de Sprint 0
(repositorio, autenticación, modelo multiempresa) y el Módulo 1 de Sprint 1
(Empresas y Sucursales), ya aprobado.

### Agregado

- **Empresas**: alta, edición, consulta y listado de empresas autorizadas
  (`POST/GET/PATCH /companies`, `GET /me/companies`), con razón social, CUIT,
  condición fiscal, actividad, domicilio, contacto, logotipo, moneda y zona
  horaria.
- **Sucursales**: alta, edición y listado de sucursales por empresa
  (`/companies/:id/branches`).
- **Auditoría**: registro automático en `audit_logs` de cada alta, edición y
  cambio de estado de empresas y sucursales (usuario, fecha, entidad, acción y
  metadata relevante).
- **Activación / Desactivación**: ciclo de vida de empresas y sucursales sin
  bajas físicas (RN-003) — desactivar exige motivo; no se permite activar/
  desactivar algo que ya está en ese estado.
- **Validaciones**: formato de CUIT, campos obligatorios en los DTO de entrada,
  autorización por rol (quién puede crear una empresa, quién puede
  editarla/desactivarla), y consistencia entre el `:id` de la URL y el header
  `X-Company-Id`.
- **Pruebas**: 31 pruebas unitarias (11 casos de uso de Empresas/Sucursales +
  4 de autenticación de Sprint 0) y verificación end-to-end manual con `curl`
  contra Postgres real.

### Base heredada de Sprint 0

- Autenticación (login, refresh token con rotación, JWT).
- Modelo multiempresa (`Tenant`, `Company`, `User`, `Role`, `CompanyUser`,
  `RefreshToken`, `AuditLog`) y aislamiento por `company_id`.
- Monorepo con workspaces, CI en GitHub Actions, Docker Compose para Postgres.
