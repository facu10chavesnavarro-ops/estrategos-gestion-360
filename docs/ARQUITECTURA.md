# Arquitectura — Estrategos Gestión 360

## 1. Principios rectores

- **Clean Architecture**: el dominio (reglas de negocio) no depende de frameworks, base de datos ni HTTP. Las dependencias siempre apuntan hacia adentro (Presentación → Aplicación → Dominio ← Infraestructura).
- **SOLID** aplicado a nivel de módulo NestJS: cada módulo expone una interfaz (puerto), no una implementación concreta.
- **Multiempresa real desde el día 1**: toda entidad transaccional lleva `companyId`. El aislamiento se refuerza en tres capas (guard HTTP, query builder, constraint de base de datos), nunca en una sola.
- **Nada se borra físicamente**: las operaciones confirmadas se anulan con motivo (soft-cancel), nunca `DELETE`.

## 2. Estructura de carpetas (por módulo, dentro de `apps/api/src/modules/<modulo>`)

```
modulo/
  domain/
    entities/       -> clases de dominio puras (sin decoradores de Nest/Prisma)
    repositories/    -> interfaces (puertos) — ej. UserRepository (abstract)
    errors/          -> errores de dominio tipados
  application/
    use-cases/       -> un caso de uso = una clase con un método execute()
    dto/             -> contratos de entrada/salida de la capa de aplicación
  infrastructure/
    persistence/     -> implementación concreta del repositorio con Prisma
    mappers/          -> Prisma <-> Entidad de dominio
  presentation/
    controllers/      -> HTTP, valida con class-validator, delega al use-case
    guards/            -> autorización específica del módulo si aplica
```

Regla dura: **un archivo de `domain/` nunca importa nada de `infrastructure/` ni de Nest** (`@nestjs/common` incluido). Se verifica con ESLint (`no-restricted-imports` por carpeta).

## 3. Multi-tenancy: decisión

Estrategia elegida: **base de datos compartida + columna `company_id`** (recomendada por el propio documento fuente), reforzada con:

1. **Guard global** (`CompanyContextGuard`): toda request autenticada resuelve qué empresas puede ver el usuario y las inyecta en el `request context`.
2. **Repositorio base** (`TenantScopedRepository`): todo método de consulta exige `companyId` como parámetro obligatorio en su firma — es imposible compilar una query que lo omita.
3. **Row Level Security (RLS) de Postgres** como última barrera, activado en Sprint 0 sobre las tablas core (`companies`, `users_companies`), y sobre cada tabla transaccional a medida que se crea en sprints siguientes.

## 4. Autenticación y autorización

- JWT de acceso (vida corta, ~15 min) + refresh token (rotación, almacenado hasheado en base de datos, revocable).
- Passwords con **argon2** (no bcrypt — mejor resistencia a GPU cracking).
- Autorización por rol **y por empresa**: un usuario puede ser "Administrador" en la Empresa A y "Consultor" (solo lectura) en la Empresa B — se modela con una tabla puente `company_users` con `role_id`, no con un rol global de usuario.

## 5. Stack técnico confirmado

| Capa | Elección | Justificación |
|---|---|---|
| Backend | NestJS + TypeScript | Módulos nativos, DI de fábrica para Clean Architecture, decoradores para validación |
| Frontend | Next.js + React + TS | Ya definido en el documento fuente |
| ORM / DB | Prisma + PostgreSQL | Migraciones tipadas, transacciones ACID, soporte RLS |
| Auth | Passport + JWT + argon2 | Estándar, sin vendor lock-in |
| Almacenamiento | Cloudflare R2 (S3-compatible) | Más económico que S3, misma API |
| Hosting | Vercel (web) + Railway (api) + Neon (Postgres) | Bajo costo operativo para MVP, escalable sin migrar de proveedor |
| CI/CD | GitHub Actions | Gratis para repos privados en volumen bajo, integra bien con Vercel/Railway |
| Monitoreo | Sentry | Errores de frontend y backend en un solo panel |

## 6. Convención de commits y ramas

- Ramas: `main` (producción), `develop` (staging), `feature/<módulo>-<descripción>`.
- Commits: Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`).
- Ningún merge a `main` sin PR revisado y pipeline de CI en verde.

## 7. Definición de "Sprint terminado" (aplica a todos los sprints, no solo el 0)

Ver `docs/SPRINT-0.md` — checklist de cierre que se repite (adaptada) en cada sprint.

## 8. Decisiones diferidas para tablas de alto volumen (Sprint 3+)

Registrado durante el diseño del Módulo 1 de Sprint 1 (Empresas y Sucursales), a
partir de una revisión de escalabilidad: `Company`, `Branch` y `CompanyUser` usan hoy
`@default(uuid())` (UUID v4, aleatorio) porque su volumen esperado (cientos o miles de
filas) no lo justifica. Las tablas de alto volumen que todavía no existen —
movimientos financieros, ventas, cobros, pagos, auditoría avanzada — se diseñan
recién en Sprint 3+, pero estas reglas quedan fijadas **desde ahora** para que su
diseño no tenga que rehacerse después:

1. Los montos se modelan con `Decimal`/`Numeric`, nunca con `Float` (los errores de
   redondeo de punto flotante son inaceptables en saldos financieros).
2. Todo índice pensado para reportes por período incluye `companyId` **y** la columna
   de fecha en el mismo índice compuesto (no dos índices separados) — ya aplicado
   ahora mismo a `AuditLog` (`@@index([companyId, createdAt])`) como precedente.
3. Antes de crear la primera tabla de movimientos, evaluar UUID v7 (o equivalente
   ordenable en el tiempo) en vez de UUID v4, para evitar la degradación de
   localidad de índice B-tree que un identificador aleatorio produce a volúmenes de
   millones de filas. Esto no aplica retroactivamente a `Company`/`Branch`/
   `CompanyUser`.
4. Antes de que una tabla de crecimiento ilimitado (movimientos, auditoría) se
   acerque a volúmenes de decenas de millones de filas, evaluar particionado nativo
   de Postgres o una estrategia de archivado — Prisma no soporta particionado
   declarativo, así que si se necesita, se implementa con SQL crudo en la migración.
5. Ninguna consulta a una tabla transaccional puede omitir el filtro por `tenantId`
   y/o `companyId` — ninguna optimización de performance puede saltarse esto.
6. Ninguna optimización futura (índices, particionado, desnormalización, caché)
   puede sacrificar la trazabilidad (RN-009, auditoría) ni el aislamiento
   multiempresa (RN-001/002) — si una optimización propuesta entra en conflicto con
   alguna de las dos, se descarta o se rediseña, no se resigna la garantía.
