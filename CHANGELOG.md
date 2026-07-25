# Changelog

Todos los cambios notables del proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y el
versionado, [Versionado Semántico](https://semver.org/lang/es/). A partir de esta
versión, cada módulo de sprint aprobado genera una nueva versión etiquetada.

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
