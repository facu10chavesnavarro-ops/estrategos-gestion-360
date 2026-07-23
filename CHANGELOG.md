# Changelog

Todos los cambios notables del proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y el
versionado, [Versionado Semántico](https://semver.org/lang/es/). A partir de esta
versión, cada módulo de sprint aprobado genera una nueva versión etiquetada.

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
