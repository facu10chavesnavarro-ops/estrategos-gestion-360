# Changelog

Todos los cambios notables del proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y el
versionado, [Versionado Semántico](https://semver.org/lang/es/). A partir de esta
versión, cada módulo de sprint aprobado genera una nueva versión etiquetada.

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
