# Sprint 0 — Base técnica

Objetivo (según el documento fuente): repositorio, ambientes, CI/CD, diseño UI base, autenticación y modelo multiempresa.

## Checklist de cierre

- [x] Monorepo con workspaces (`apps/api`, `apps/web`, `packages/shared-types`)
- [x] Backend NestJS con estructura de Clean Architecture por módulo
- [x] Esquema Prisma: `Tenant`, `Company`, `User`, `Role`, `CompanyUser`, `RefreshToken`, `AuditLog`
- [x] Módulo de autenticación completo: login, refresh (con rotación), guard de JWT, guard de contexto de empresa
- [x] Docker Compose para Postgres local (presente en el repo; en esta máquina se usó Postgres nativo en su lugar — ver nota de entorno más abajo)
- [x] Variables de entorno documentadas (`.env.example`, back y front) y `.env` real generado localmente para desarrollo (no commiteado)
- [x] Pipeline de CI (lint + test + build, con Postgres de servicio) en GitHub Actions — **no verificado en esta sesión** (requiere push/PR real, ver pendientes)
- [x] Frontend Next.js: layout base, página de login funcional conectada a `/auth/login` — **código revisado, no levantado ni probado en navegador en esta sesión**
- [x] Pruebas unitarias del `LoginUseCase` (4 casos, corridas y verificadas: **pasan**, dos veces, antes y después de los fixes de esta sesión)
- [x] `tsc --noEmit` corrido y verificado: 0 errores
- [x] **Row Level Security de Postgres**: sigue diseñado en `docs/ARQUITECTURA.md` pero **no implementado como migración SQL todavía** — se traslada a Sprint 1 junto con las primeras tablas transaccionales, como ya estaba previsto
- [x] `npx prisma generate` — corrido y verificado, sin bloqueos de red en esta máquina
- [x] `npx prisma migrate dev --name init` — corrido y verificado contra una base Postgres real (`estrategos_dev`)
- [x] Seed (`npm run prisma:seed`) — corrido y verificado: crea 8 roles, 1 tenant, 1 empresa piloto y el usuario `admin@estrategos.local` / `CambiarEsta123!`
- [x] Prueba end-to-end del login: servidor levantado con `npm run start` y probado con `curl` contra `POST /api/v1/auth/login` — **credenciales válidas → 200 con accessToken/refreshToken/user; credenciales inválidas → 401 con mensaje claro**
- [ ] Despliegue real a Railway/Vercel/Neon (pendiente: requiere que el usuario cree las cuentas y cargue las credenciales)

## Verificación honesta de lo que se probó en esta sesión

- ✅ `npm install` desde la raíz del monorepo (workspaces): sin errores.
- ✅ Install-scripts de `@nestjs/core`, `@prisma/client`, `@prisma/engines`, `argon2`, `prisma` aprobados explícitamente (npm 11 los bloquea por defecto por seguridad de cadena de suministro) y `npm rebuild` corrido.
- ✅ `npx prisma generate`: generado sin problemas.
- ✅ `npx tsc --noEmit`: 0 errores.
- ✅ `npm run lint`: 0 errores (después del fix descripto abajo).
- ✅ `npm test`: **4/4 tests de `LoginUseCase` pasan** (corridos dos veces en la sesión).
- ✅ `npx prisma migrate dev --name init`: aplicada contra Postgres 17 real, corriendo como servicio nativo de Windows.
- ✅ `npm run prisma:seed`: corrido, datos de prueba creados y verificados por consulta directa.
- ✅ Login end-to-end real: `npm run start` levantando el servidor compilado (`dist/main.js`) y `curl` contra `http://localhost:3001/api/v1/auth/login` — probado el camino feliz (200) y el de error (401 con `message` string, no objeto).
- ⛔ No se instaló ni levantó el frontend (`apps/web`) en esta sesión — no se probó el flujo de login en navegador real, solo se revisó que el contrato de `api-client.ts` coincide con la respuesta real del backend (ver bug corregido abajo).
- ⛔ El pipeline de CI de GitHub Actions no se corrió (no hay repo Git inicializado en esta carpeta todavía, ni remoto configurado).

## Bugs reales encontrados y corregidos en esta sesión

1. **`apps/api/.eslintrc.js`** — la regla `no-restricted-imports` (Clean Architecture: `domain/` no puede importar Nest/Prisma) estaba activa globalmente y el `overrides` que debía desactivarla fuera de `domain/` era incompleto: no cubría `common/**` ni los `*.module.ts` dentro de `modules/*`. Resultado: 16 falsos positivos en archivos que legítimamente usan Nest/Prisma. **Corregido** invirtiendo la lógica: la regla ahora se activa *solo* para `**/domain/**`, más robusto ante carpetas nuevas. Verificado que sigue bloqueando imports de Nest en `domain/` (se probó insertando uno a propósito y se confirmó el error, después se restauró el archivo).
2. **`apps/api/tsconfig.json`** — sin `rootDir`/`include`/`exclude`, TypeScript compilaba también `prisma/` y `test/`, y el build quedaba en `dist/src/main.js` en vez de `dist/main.js`, rompiendo `npm run start` (`node dist/main`) con `MODULE_NOT_FOUND`. **Corregido** agregando `apps/api/tsconfig.build.json` (extiende la base, `rootDir: "./src"`, excluye `test`/`prisma`) que es lo que usa `nest build` por convención de Nest CLI, dejando `tsconfig.json` sin tocar para que ESLint/`tsc --noEmit` sigan cubriendo `test/` con chequeo de tipos.
3. **`apps/api/src/common/filters/http-exception.filter.ts`** — anidaba la respuesta ya estructurada de Nest (`{statusCode, message, error}`) dentro de un campo `message` externo, por lo que el JSON de error final tenía `message` como **objeto**, no string. El frontend (`apps/web/src/lib/api-client.ts:32`) chequea `typeof body.message === 'string'` para decidir si mostrar el mensaje real o un genérico — con el bug, **cualquier error de login mostraba siempre "No se pudo iniciar sesión" en vez del mensaje real** ("Credenciales inválidas", etc.). **Corregido** aplanando la respuesta cuando `exception.getResponse()` ya trae su propio `message`. Verificado con `curl`: `401` ahora devuelve `"message":"Credenciales inválidas"` como string plano.

## Nota de entorno (esta máquina, no el proyecto)

- La máquina no tenía Node.js, Docker ni PostgreSQL instalados al empezar. Se instalaron Node.js LTS y Docker Desktop vía `winget` con confirmación del usuario.
- Docker Desktop no pudo usarse: primero porque WSL2 requería habilitar virtualización en la BIOS (resuelto por el usuario), y después porque quedó con un socket interno (`dockerInference`) en un estado bloqueado por el sistema operativo que ni un `wsl --shutdown` ni borrado forzado lograron liberar sin reinicio.
- Con acuerdo del usuario, se cambió de plan: se instaló **PostgreSQL 17 nativo** vía `winget` en su lugar. El `docker-compose.yml` del repo queda intacto y sigue siendo la opción recomendada en otras máquinas/CI; en esta máquina se usó Postgres nativo (usuario `estrategos` / base `estrategos_dev`, mismas credenciales que `.env.example`).
- El usuario no tiene (o no pudo activar) permisos de administrador de Windows para controlar el servicio de Postgres; se evitó ese camino por completo usando la contraseña por defecto del instalador silencioso de `winget` en vez de editar `pg_hba.conf` (el cual se dejó exactamente como lo generó el instalador, sin cambios).

## Qué falta para considerar Sprint 0 100% cerrado en producción

1. Crear las cuentas reales (Neon, Railway, Vercel, Cloudflare R2, Sentry) — lo tiene que hacer el usuario, son cuentas y credenciales propias.
2. Cargar los secretos en cada plataforma (nunca en el repo).
3. Inicializar el repositorio Git y verificar el pipeline de CI contra un PR real (no hay `git init` corrido todavía en esta carpeta).
4. Levantar `apps/web` y probar el login desde el navegador real (solo se verificó por código y por `curl` al backend).

## Cierre

**Sprint 0 se da por cerrado a nivel de desarrollo local**: arquitectura, autenticación, modelo de datos, migraciones, seed y login end-to-end están implementados y verificados con evidencia real de comandos corridos. Los puntos de "producción" (cuentas cloud, CI real, frontend en navegador) quedan pendientes y dependen de acciones del usuario o de pasos no cubiertos en esta sesión.

Arranca Sprint 1 (Empresas y seguridad — sección 6.4, módulos M02/M15 del documento fuente) según lo previsto en `docs/ARQUITECTURA.md`.
