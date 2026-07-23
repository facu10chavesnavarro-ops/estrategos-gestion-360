# Sprint 1 — Empresas y seguridad

Objetivo (según `docs/SPRINT-0.md` / documento fuente): Empresas, sucursales,
usuarios, roles, permisos e invitaciones.

Estado: **cerrado.** Los dos módulos que componen el alcance de este sprint
están implementados, probados y versionados (`v0.1.0`, `v0.2.0`).

## 1. Metodología seguida

A pedido explícito del usuario, cada módulo se desarrolló de forma
independiente y en este orden por módulo:

1. Documentación completa **antes** de escribir código: modelo de datos,
   reglas de negocio, endpoints, casos de uso y plan de pruebas.
2. Resolución de ambigüedades o tensiones de diseño con el usuario antes de
   programar (no se asumió nada silenciosamente).
3. Implementación siguiendo Clean Architecture (`domain/ → application/ →
   infrastructure/ → presentation/`, regla dura de `docs/ARQUITECTURA.md`).
4. Verificación real: `tsc --noEmit`, `lint`, tests unitarios, y verificación
   end-to-end manual con `curl` contra Postgres real.
5. Resumen técnico y espera de aprobación del usuario antes de continuar.
6. Al aprobarse un módulo: commit, actualización de `CHANGELOG.md` y tag de
   versión — política fijada por el usuario a partir de este sprint.

Documentos de diseño de cada módulo (quedan como fuente de verdad detallada,
este archivo es el resumen de cierre):

- [`docs/sprint-1/01-empresas-sucursales.md`](sprint-1/01-empresas-sucursales.md)
- [`docs/sprint-1/02-usuarios-roles-permisos-invitaciones.md`](sprint-1/02-usuarios-roles-permisos-invitaciones.md)

## 2. Arquitectura

Se mantuvo la Clean Architecture por módulo fijada en Sprint 0, y se
introdujo un ajuste estructural nuevo en este sprint: un **"núcleo
compartido"** en `apps/api/src/common/domain/` y
`apps/api/src/common/infrastructure/`, para lo que más de un módulo necesita
por igual:

- `common/domain/rules/assert-role.ts` + `RoleNotAuthorizedError` — chequeo de
  autorización por rol, reutilizado por Empresas y por Usuarios.
- `common/domain/rules/company-roles.ts` — listas de roles autorizados
  (`ROLES_THAT_CAN_CREATE_COMPANY`, `ROLES_THAT_CAN_MANAGE_COMPANY`).
- `common/domain/repositories/audit-log.repository.ts` +
  `common/infrastructure/persistence/prisma-audit-log.repository.ts` —
  puerto de auditoría, usado ahora por `auth`, `companies` y `users`.

Esto nació como deuda técnica anotada explícitamente al cerrar el Módulo 1
("el chequeo de rol es un helper local mínimo, se migra cuando el Módulo 2
aporte el mecanismo genérico") y se pagó al empezar el Módulo 2, antes de
escribir código nuevo — no se dejó acumular.

Las tres barreras de aislamiento multiempresa de `docs/ARQUITECTURA.md`
sección 3 siguen en el mismo estado que al cerrar Sprint 0: guard HTTP
(`CompanyContextGuard`, ahora también rechaza membresías `isActive=false`) y
repositorio tipado están implementados; **Row Level Security de Postgres
sigue sin implementarse** (ver §9, trabajo pendiente).

## 3. Módulo 1 — Empresas y Sucursales

### Modelo de datos

- `Company` extendida: `activity`, `address`, `contactName`, `contactEmail`,
  `contactPhone`, `logoUrl`, `currency` (default `ARS`), `timezone` (default
  `America/Argentina/Jujuy`).
- `Branch` (nuevo): sucursal/punto operativo de una empresa.
- Índice compuesto `AuditLog(companyId, createdAt)` agregado de forma
  proactiva, antes de que existiera ninguna tabla de alto volumen, a partir
  de una revisión de escalabilidad pedida por el usuario.

### Reglas de negocio (RN-EMP-01 a RN-EMP-09)

Empresas y sucursales nunca se eliminan físicamente (RN-EMP-04); solo
usuarios con rol `Superadministrador`/`Administrador Estrategos` en el mismo
tenant pueden crear una empresa nueva (RN-EMP-03 — decisión de diseño
explícita, ver §5); editar/activar/desactivar requiere
`Administrador Estrategos`, `Propietario` o `Administrador de empresa`
(RN-EMP-07); toda alta, edición y cambio de estado se audita (RN-EMP-05);
activar algo ya activo o desactivar algo ya inactivo es error, no no-op
(RN-EMP-06); CUIT se valida por formato, no por existencia real (RN-EMP-08).

### Endpoints

`POST/GET/PATCH /companies`, `GET /companies/:id`,
`POST /companies/:id/(de)activate`, `GET/POST /companies/:id/branches`,
`PATCH /companies/:id/branches/:branchId`,
`POST /companies/:id/branches/:branchId/(de)activate`, y el ya existente
`GET /me/companies` de Sprint 0.

### Casos de uso

10 nuevos (`CreateCompanyUseCase`, `UpdateCompanyUseCase`,
`GetCompanyByIdUseCase`, `DeactivateCompanyUseCase`, `ActivateCompanyUseCase`,
`CreateBranchUseCase`, `UpdateBranchUseCase`, `ListBranchesUseCase`,
`DeactivateBranchUseCase`, `ActivateBranchUseCase`) + `ListMyCompaniesUseCase`
reutilizado sin cambios (ya existía desde Sprint 0).

## 4. Módulo 2 — Usuarios, Roles, Permisos e Invitaciones

### Modelo de datos

- `Invitation` (nuevo): `companyId`, `email`, `roleId`, `tokenHash` (nunca el
  token en texto plano), `invitedByUserId`, `revokedByUserId`, `expiresAt`,
  `acceptedAt`, `revokedAt`. Sin columna `status` — se calcula desde esas tres
  últimas fechas.
- `CompanyUser.isActive` (nuevo): permite revocar el acceso de un usuario a
  una empresa puntual sin borrar la membresía y sin afectar sus membresías en
  otras empresas.
- `UserRepository` (módulo `auth`) ganó un método `create()`.

### Reglas de negocio (RN-USR-01 a RN-USR-14)

Mismo conjunto de roles administradores puede invitar, revocar, cambiar rol y
activar/desactivar miembros (RN-USR-01); invitación expira a los 7 días
(RN-USR-04); no se invita a un email con membresía activa (RN-USR-05) ni con
invitación pendiente duplicada (RN-USR-06); aceptar crea o reutiliza el
`User` sin pisar contraseña existente (RN-USR-07); primer login se audita
(RN-USR-08); nadie puede cambiarse su propio rol ni autodesactivarse
(RN-USR-12); toda revocación registra quién la hizo (RN-USR-13); la
notificación de invitación está detrás de un puerto reemplazable, hoy no-op
(RN-USR-14).

### Endpoints

`GET /roles`, `GET /companies/:id/members`,
`PATCH /companies/:id/members/:userId/role`,
`POST /companies/:id/members/:userId/(de)activate`,
`GET/POST /companies/:id/invitations`,
`POST /companies/:id/invitations/:invitationId/revoke`,
`GET /invitations/:token` (público), `POST /invitations/:token/accept`
(público).

### Casos de uso

10 nuevos (`ListRolesUseCase`, `ListCompanyMembersUseCase`,
`CreateInvitationUseCase`, `ListInvitationsUseCase`,
`RevokeInvitationUseCase`, `GetInvitationByTokenUseCase`,
`AcceptInvitationUseCase`, `ChangeMemberRoleUseCase`,
`DeactivateMemberUseCase`, `ActivateMemberUseCase`) + 1 modificado
(`LoginUseCase`, para auditar el primer acceso).

## 5. Decisiones de diseño relevantes

1. **RN-EMP-03 (alta de empresa)**: el documento fuente supone un rol de
   consultora ("Administrador Estrategos") pero `ARQUITECTURA.md` prohíbe un
   rol global de usuario. Se resolvió derivando la autorización del tenant:
   puede crear una empresa quien ya tenga rol administrador en **alguna**
   empresa existente del mismo tenant — sin agregar ningún campo de rol
   global a `User`.
2. **Estado calculado, no persistido**: ni `Invitation` ni ninguna entidad de
   este sprint guarda una columna `status` redundante — se deriva de fechas.
   Mismo criterio ya fijado en `ARQUITECTURA.md` §8 para montos.
3. **`InvitationNotifierPort`**: la creación de una invitación nunca depende
   de un proveedor de email concreto. El adaptador de este sprint es no-op;
   conectar SMTP/Gmail/Microsoft 365/SendGrid/SES es un adaptador nuevo, cero
   cambios en casos de uso.
4. **SHA-256 para el token de invitación, no argon2**: un token aleatorio de
   32 bytes ya tiene entropía suficiente; usar un hash lento pensado para
   contraseñas de baja entropía sería una sobre-ingeniería sin beneficio de
   seguridad real. Mismo criterio que `RefreshToken` desde Sprint 0.
5. **UUID v4 vs v7**: se dejó registrado en `ARQUITECTURA.md` §8 que
   `Company`/`Branch`/`CompanyUser`/`Invitation` siguen con UUID v4 porque su
   volumen no lo justifica, y que las tablas de alto volumen de Sprint 3+
   (movimientos financieros) deben evaluar UUID v7 antes de crearse.

## 6. Pruebas ejecutadas (evidencia real, no estimada)

- **Unitarias**: `npm test` → **59/59 tests pasan**, 5 suites
  (`companies` × 2, `users` × 2, `auth` × 1).
- **`npx tsc --noEmit`**: 0 errores.
- **`npm run lint`**: 0 errores.
- **End-to-end manual con `curl` contra Postgres real** (sin infraestructura
  de integration-test automatizada, igual que en Sprint 0): alta/edición/
  activación/desactivación de empresas y sucursales con rechazo por rol;
  flujo completo de invitación (crear → preview público → aceptar → login →
  auditoría de primer acceso, sin repetirse en logins siguientes); rechazo de
  invitación duplicada y de membresía activa duplicada; revocación con
  registro de quién revocó; cambio de rol con auditoría de rol anterior/
  nuevo; auto-modificación bloqueada; desactivación de miembro verificada
  bloqueando acceso real (403) y reactivación restaurándolo; **mismo usuario
  con roles distintos en dos empresas distintas, confirmado con datos
  reales**; aceptar una invitación para un email existente no pisa su
  contraseña (verificado con un login posterior).

## 7. Bugs reales encontrados y corregidos durante este sprint

1. **`.eslintrc.js`** (Módulo 1): `no-restricted-imports` mal alcanzado
   generaba 16 falsos positivos fuera de `domain/`. Corregido invirtiendo la
   lógica de la regla.
2. **`tsconfig.json` sin `rootDir`** (Módulo 1): `npm run start` fallaba con
   `MODULE_NOT_FOUND` porque el build anidaba la salida en `dist/src/`.
   Corregido separando `tsconfig.build.json`.
3. **`http-exception.filter.ts`** (Módulo 1): anidaba la respuesta de error
   de Nest, rompiendo el contrato que ya esperaba el frontend
   (`api-client.ts`) — cualquier error de login mostraba siempre el mensaje
   genérico. Corregido aplanando la respuesta.
4. **`JwtAuthGuard`** (Módulo 2, bug heredado de Sprint 0): un token
   inválido o expirado devolvía 500 en vez de 401 porque el guard no
   capturaba el error de `verifyAccessToken`. Nunca se había probado
   end-to-end con un token corrupto hasta este sprint. Corregido.
5. **Caché incremental de TypeScript** (recurrente en Sprint 0 y dos veces
   más en Módulo 2): `rm -rf dist && nest build` podía terminar con éxito
   (exit 0) sin emitir casi nada, porque `tsconfig.build.tsbuildinfo` seguía
   pensando que los archivos no habían cambiado. Agregarlo a `.gitignore` en
   Sprint 0 no alcanzaba — el síntoma volvía cada vez que se borraba `dist/`
   sin acordarse de borrar también esa caché a mano. Corregido de raíz en
   este sprint: `"incremental": false` en `tsconfig.build.json`. Verificado
   corriendo el build dos veces seguidas sin limpiar caché entre medio.

## 8. Métricas de cierre

| Métrica | Resultado |
|---|---|
| Tests unitarios | 59/59 |
| Suites de test | 5/5 |
| `tsc --noEmit` | 0 errores |
| `npm run lint` | 0 errores |
| Módulos entregados | 2/2 (Empresas y Sucursales; Usuarios, Roles, Permisos e Invitaciones) |
| Casos de uso nuevos | 20 (10 + 10) + 1 modificado (`LoginUseCase`) |
| Endpoints nuevos | 20 (10 + 10) — no cuenta `GET /me/companies`, ya existía desde Sprint 0 |
| Migraciones aplicadas | 2 (`company_fields_branches_auditlog_index`, `invitations_and_company_user_active`) |
| Bugs reales encontrados y corregidos | 5 |
| Versión alcanzada | `v0.2.0` |

## 9. Versionado

| Tag | Commit | Contenido |
|---|---|---|
| `v0.1.0` | `docs: add CHANGELOG.md for v0.1.0` | Sprint 0 + Módulo 1 (Empresas y Sucursales) |
| `v0.2.0` | `docs: add CHANGELOG.md for v0.2.0` | Módulo 2 (Usuarios, Roles, Permisos e Invitaciones) |

Detalle completo de cada versión en [`CHANGELOG.md`](../CHANGELOG.md).

## 10. Explícitamente no cubierto / trabajo pendiente

- **Row Level Security de Postgres**: sigue diseñada en `ARQUITECTURA.md`
  pero no implementada como migración SQL — arrastrado desde Sprint 0,
  todavía no se creó ninguna tabla transaccional que la vuelva urgente.
- **Envío real de email**: no hay proveedor conectado (SMTP/Gmail/Microsoft
  365/SendGrid/SES). El puerto ya existe (`InvitationNotifierPort`) para que
  conectar uno no requiera tocar dominio, pero conectarlo en sí no se hizo.
- **Recuperación de contraseña** (`/auth/forgot-password`), **bloqueo por
  intentos fallidos de login** y **matriz de permisos fina por
  módulo/pantalla**: explícitamente fuera de alcance de este sprint (ver
  razones en `docs/sprint-1/02-...md` §0.2), quedan para un sprint posterior.
- **Frontend**: no se levantó `apps/web` ni se probó ningún flujo desde el
  navegador en este sprint — toda la verificación fue contra el backend
  (`curl`) y contra Postgres real.
- **CI real**: el pipeline de GitHub Actions no se corrió contra un PR real
  (no hay remoto configurado todavía, solo el repositorio Git local
  inicializado en Sprint 0).
- **Pruebas de integración automatizadas** contra una base de datos de test:
  no existen todavía; toda la verificación end-to-end fue manual con `curl`,
  documentado explícitamente como tal en cada módulo.
- Dato de prueba real en `estrategos_dev` (empresas, usuarios e invitaciones
  de las verificaciones end-to-end de ambos módulos) — no se borró, por la
  misma regla de no eliminar físicamente que aplica al resto del sistema; no
  afecta al seed oficial ni a los tests automatizados.

## 11. Cierre

**Sprint 1 se da por cerrado**: los dos módulos de su alcance (Empresas y
Sucursales; Usuarios, Roles, Permisos e Invitaciones) están documentados,
implementados, probados (59/59) y versionados (`v0.2.0`). Los puntos del §10
quedan pendientes para sprints posteriores, sin inflar el estado de lo que sí
se completó.

Arranca Sprint 2 (Terceros — Clientes, Proveedores, importación CSV, fichas y
documentación) según `docs/SPRINT-0.md` y la sección "Alcance por etapas" del
documento fuente, con la misma metodología: documentación completa primero,
luego implementación, pruebas, CHANGELOG y versionado.
