# Auditoría técnica integral — pre-Sprint 3

Fecha: 2026-07-23. Alcance: todo el sistema construido en Sprint 0, 1 y 2
(v0.1.0 → v0.3.0), antes de empezar Sprint 3. Revisión crítica pedida
explícitamente por el usuario, sin asumir que "los tests pasan" equivale a
"está todo bien".

Metodología: lectura directa del código actual (no de memoria de lo ya
escrito), evidencia de comandos corridos, y verificación empírica donde fue
posible (incluyendo un intento real de condición de carrera con `curl`).

## 1. Hallazgos por severidad

### 🔴 CRÍTICO

**H1 — No hay transacciones de base de datos en operaciones multi-tabla.**

El documento fuente fija como decisión arquitectónica obligatoria (§10.1):
*"Utilizar transacciones de base de datos para confirmar operaciones y
movimientos relacionados."* Esto no se cumple. Casos de uso que escriben en
más de una tabla lo hacen con llamadas a Prisma completamente
independientes, sin `$transaction`:

- `CreateCompanyUseCase`: crea `Company`, después `CompanyUser` (membresía
  del creador), después `AuditLog`. Si la segunda escritura falla después de
  que la primera tuvo éxito, queda una **empresa huérfana que nadie puede
  acceder nunca más** (`CompanyContextGuard` exige una fila `CompanyUser`
  activa).
- `CreateCustomerUseCase`/`CreateSupplierUseCase`: crea `Party` (si no
  existe) y después `Customer`/`Supplier`. Una falla entre medio deja un
  `Party` sin ningún rol.
- `AcceptInvitationUseCase`: crea `User` (si no existe), después
  `CompanyUser`, después marca la invitación aceptada. Si falla el último
  paso, un reintento de aceptar la MISMA invitación choca contra la
  restricción única `(userId, companyId)` de `CompanyUser` — antes de esta
  auditoría, ese choque devolvía 500 genérico (ver H6, ya corregido).
- Los `Import{Customers|Suppliers}UseCase` procesan cada fila con la misma
  falta de atomicidad Party+rol.

**Impacto de negocio**: en un sistema administrativo/financiero, una
operación a medias no es un detalle técnico — es un registro fantasma que
alguien va a tener que diagnosticar manualmente en producción.

**Por qué no se corrige automáticamente**: envolver múltiples llamadas a
repositorios en una sola transacción de Prisma, sin romper Clean
Architecture (el dominio no puede importar `Prisma.TransactionClient`),
requiere elegir un patrón real de "Unit of Work". Ver §2 para las
alternativas y la decisión pendiente.

### 🟠 ALTO

**H2 — No existe endpoint de cierre de sesión (`logout`).** M01 del
documento fuente pide explícitamente "Inicio y **cierre** de sesión"; solo
existían `/auth/login` y `/auth/refresh`. Un refresh token filtrado seguía
siendo válido hasta sus 30 días de vencimiento natural, sin forma de
revocarlo. **Corregido**: `POST /auth/logout` nuevo, revoca el refresh
token; verificado end-to-end (login → logout → intentar refrescar con ese
token → 401; logout repetido → sigue devolviendo 200, idempotente).

**H3 — Row Level Security de Postgres sigue sin implementarse.** Arrastrado
desde Sprint 0. El aislamiento multiempresa depende **exclusivamente** de la
capa de aplicación (`CompanyContextGuard` + filtro `companyId` en cada
repositorio) — no hay una segunda barrera a nivel de base de datos. El
comentario en `CompanyContextGuard` prometía que se agregaría "en Sprint 1"
y nunca ocurrió; **corregido el comentario** para no repetir una promesa de
fecha que no se cumplió. La implementación en sí requiere una decisión (ver
§2).

**H4 — No hay bloqueo por intentos fallidos de login.** M01 lo pide
explícitamente ("Bloqueo por intentos fallidos"). Ya estaba documentado como
diferido en Sprint 1/2, sigue sin resolverse. Requiere decisión de mecanismo
(ver §2).

**H5 — No existía documentación de API viva (Swagger/OpenAPI).** El
documento fuente lo exige dos veces: como decisión arquitectónica obligatoria
(§10.1: "Documentar API... desde la primera versión") y como entregable
exigido (§17: "Documentación de API"). Antes de esta auditoría, la única
documentación de endpoints eran los archivos Markdown de diseño de cada
sprint — útiles, pero no una API explorable/testeable. **Corregido**:
`@nestjs/swagger` + `helmet` agregados; `GET /api/docs` sirve Swagger UI,
`GET /api/docs-json` el spec OpenAPI crudo. Verificado con `curl` que ambos
responden. Los 9 controllers tienen `@ApiTags` para agruparse por módulo.
Pendiente como mejora incremental (no bloqueante): decorar cada DTO con
`@ApiProperty` para descripciones más ricas por campo — hoy Swagger
introspecciona la forma de los DTOs pero sin descripciones humanas.

**H6 — Errores de Prisma sin traducir devolvían 500 genérico.** Una
condición de carrera real (dos altas simultáneas con el mismo CUIT) podía
hacer que el chequeo de duplicado de la aplicación pasara en ambos
requests, y que la restricción única de la base de datos fuera quien
realmente lo impidiera — pero ese choque (`P2002`) no estaba mapeado, así
que el segundo request veía "Error interno del servidor" en vez de un 409
entendible. **Corregido**: `GlobalExceptionFilter` ahora traduce `P2002`
(conflicto de unicidad → 409) y `P2025` (registro no encontrado → 404) antes
de cualquier otro chequeo. Se intentó reproducir la condición de carrera
real con dos `curl` en paralelo contra el mismo CUIT nuevo: en el intento
concreto, el chequeo de aplicación alcanzó a atajar el duplicado (400) antes
de que la restricción de base de datos entrara en juego — la ventana de
carrera es angosta y no se forzó de forma determinística. Lo que sí quedó
confirmado: **ningún duplicado se creó bajo ningún orden de ejecución**, que
es la propiedad de seguridad que importa; el mapeo a 409 queda como red de
seguridad para el caso en que la ventana sí se abra.

### 🟡 MEDIO

**H7 — Código duplicado**: función `pick()` idéntica, copiada entre
`update-customer.use-case.ts` y `update-supplier.use-case.ts`. **Corregido**:
movida a `common/application/pick.ts`, reutilizada por ambos.

**H8 — Cobertura de tests con huecos reales.** Cero tests unitarios para
`GetCompanyByIdUseCase`, `GetCustomerByIdUseCase`, `ListCustomersUseCase`,
`GetSupplierByIdUseCase`, `ListSuppliersUseCase` — casos de uso simples,
pero sin verificar. Además, `CsvParseAdapter` (el único punto del sistema
que usa la librería `csv-parse` de verdad) tenía cero tests: todo lo demás
mockea el parser, así que nunca se había ejercitado el parseo real de CSV
(comillas, comas dentro de campos, líneas vacías, CSV mal formado).
**Corregido**: 19 tests nuevos cubriendo los 5 casos de uso y 7 casos del
parser real (incluyendo un CSV con comillas sin cerrar, que confirma que
`BadRequestException` se lanza correctamente).

**H9 — Sin índices compuestos `(companyId, isActive)`.** El patrón de
consulta más común del sistema ("listar activos de la empresa X") solo
tenía `@@index([companyId])` en `Branch`, `CompanyUser`, `Customer` y
`Supplier` — el filtro por `isActive` no estaba cubierto por el índice.
**Corregido**: migración `composite_active_indexes` agregando el índice
compuesto a las cuatro tablas.

**H10 — `creditLimit` negativo solo se validaba en la aplicación, no en la
base de datos.** Cualquier escritura futura que no pasara por
`Create`/`UpdateCustomerUseCase` (un script, una migración de datos, un
módulo nuevo con un bug) podía dejar un valor inválido. **Corregido**:
`CHECK` constraint agregado en la migración `credit_limit_check_constraint`.

**H11 — Nombre de error semánticamente incorrecto.** `verifyAccessToken`
lanzaba `InvalidRefreshTokenError` (copiado del método de al lado) en vez de
un error propio de access token. No era un bug funcional (el guard captura
cualquier error y lo traduce a 401 igual), pero sí un error de nombres que
podía confundir a quien depure logs más adelante. **Corregido**: nuevo
`InvalidAccessTokenError`, usado donde corresponde.

**H12 — Dependencias 1-2 versiones mayores atrasadas, con 23
vulnerabilidades conocidas en la cadena de dependencias.** NestJS 10→11,
Prisma 5→7, TypeScript 5→7, ESLint 8→10, Jest 29→30. `npm audit` reporta 23
vulnerabilidades (3 bajas, 14 moderadas, 8 excepcionalmente altas según el
recuento tras agregar Swagger/helmet) — la gran mayoría en `@nestjs/cli` y
su cadena de build (`webpack`, `glob`, `tmp`, `inquirer`, `ajv`), que **no
viajan a producción** (son herramientas de desarrollo). Las que sí afectan
runtime (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`) son
de severidad moderada. `npm audit fix` sin `--force` no resuelve nada — todo
requiere saltar de versión mayor. Se intentó instalar `@nestjs/swagger`
en su versión más reciente y confirmó el problema: exige `@nestjs/common
^11`, que todavía no tenemos. Requiere decisión (ver §2).

**H13 — `RefreshToken` no tiene limpieza de tokens vencidos.** La tabla
crece indefinidamente (cada login/refresh agrega una fila, las vencidas
nunca se borran ni archivan). Bajo impacto real hoy (volumen bajo), pero es
deuda técnica documentada, no un hallazgo que bloquee nada.

### 🟢 BAJO

**H14 — Asimetría de funcionalidad entre listados.**
`ListBranchesUseCase`/`ListMyCompaniesUseCase` no soportan `search`/
`isActive` como sí lo hacen `Customer`/`Supplier` (agregado en Sprint 2, no
retroactivo). No es un bug, es una inconsistencia de alcance entre sprints.
No se auto-corrige: Branches es de bajo volumen por empresa, no urge.

**H15 — Validación de CBU sin dígito verificador.** Ya documentado como
fuera de alcance explícito en Sprint 2, se reconfirma como deuda conocida,
no como hallazgo nuevo.

**H16 — Sin `trust proxy` configurado.** Relevante recién cuando haya un
proxy/load balancer delante en producción (para IP real del cliente, útil
para rate-limiting futuro). No aplica al entorno de desarrollo actual.

## 2. Decisiones que requieren tu aprobación (no se tocó nada de esto)

### Decisión A — Cómo implementar transacciones (resuelve H1, Crítico)

**El problema**: los repositorios actuales siempre usan el `PrismaService`
singleton inyectado; no hay forma de que dos llamadas a dos repositorios
distintos participen de la misma transacción sin cambiar cómo están
construidos.

**Alternativas:**

| Opción | Cómo funciona | Ventaja | Riesgo |
|---|---|---|---|
| **A1 — Unit of Work con `AsyncLocalStorage` (recomendada)** | Un puerto `TransactionManager.run(fn)` en `common/`, implementado con `prisma.$transaction(async (tx) => ...)`. `PrismaService` se extiende para devolver el `tx` activo (guardado en un `AsyncLocalStorage`) en vez del cliente normal, de forma transparente. Los casos de uso solo envuelven el bloque crítico en `unitOfWork.run(async () => { ...llamadas a repos sin cambios... })`. | No filtra tipos de Prisma al dominio; los repositorios no cambian su firma. | Requiere entender `AsyncLocalStorage` (estándar de Node, no exótico) y agregar el wrapper a cada caso de uso multi-escritura (~8-10 casos de uso). |
| **A2 — Pasar el cliente de transacción explícito por parámetro** | Cada método de repositorio acepta un `tx?` opcional. | Explícito, fácil de seguir. | El tipo de `tx` es `Prisma.TransactionClient` — **filtra Prisma a las interfaces de dominio**, rompe la regla dura de Clean Architecture del proyecto. |
| **A3 — Nested writes de Prisma donde aplique** | Para Party+Customer específicamente, un único `prisma.party.create({ data: { ..., customer: { create: {...} } } })` es atómico sin necesitar transacción manual. | Cero infraestructura nueva. | Solo resuelve el caso "crear ambos a la vez"; no ayuda a `CreateCompanyUseCase` (Company+CompanyUser no tienen esa relación de anidamiento en esa dirección) ni a `AcceptInvitationUseCase` (3 pasos, con lógica condicional entre medio). Parche parcial, no solución general. |

**Recomiendo A1**: es la única que resuelve los ~4 flujos afectados de
forma uniforme sin romper Clean Architecture. Es más trabajo inicial
(escribir el `TransactionManager` + adaptarlo a `PrismaService`) pero se
paga una sola vez y After eso, envolver un caso de uso nuevo en una
transacción es una línea.

### Decisión B — Cuándo y cómo implementar Row Level Security (resuelve H3, Alto)

Prisma no genera ni administra políticas RLS — hay que escribirlas a mano en
migraciones SQL crudas, y decidir cómo la aplicación le informa a Postgres
"qué empresa es la actual" en cada conexión/transacción (típicamente
`SET LOCAL app.current_company_id = '...'` al principio de cada transacción,
leído por las políticas `CREATE POLICY ... USING (company_id =
current_setting('app.current_company_id')::uuid)`).

**Alternativas:**
- **B1 (recomendada)**: implementarlo **junto con** la Decisión A (Unit of
  Work), ya que el mismo punto donde se abre una transacción es el lugar
  natural para fijar la variable de sesión de Postgres. Evita construir la
  infraestructura de transacciones dos veces.
- **B2**: implementarlo ahora, de forma independiente, sin esperar a A. Más
  rápido de ver funcionando, pero corre el riesgo real de tener que
  retocarlo cuando se resuelva A.
- **B3**: seguir difiriéndolo — mantener las dos barreras actuales
  (guard + filtro explícito en cada repo) como suficientes para el MVP
  piloto, y recién blindar con RLS antes de un lanzamiment comercial más
  amplio (más empresas, más superficie de ataque).

Sin recomendación única de mi parte más allá de "si se hace, que sea junto
con A" — la urgencia real de B3 depende de cuánta confianza da el momento
comercial actual (piloto acompañado vs. abierto), que es una decisión de
negocio, no solo técnica.

### Decisión C — Mecanismo de bloqueo por intentos fallidos de login (resuelve H4, Alto)

**Alternativas:**
- **C1 (recomendada para este tamaño de proyecto)**: contador en Postgres
  (un campo `failedLoginAttempts`/`lockedUntil` en `User`), incrementado en
  cada `InvalidCredentialsError`, reseteado en login exitoso. Sin
  infraestructura nueva (ya hay Postgres), pero cada intento fallido es una
  escritura a la misma fila `User` — con el volumen actual (piloto, no miles
  de intentos por segundo) no es un problema.
- **C2**: Redis con TTL nativo para el contador. Más apropiado a mayor
  escala (evita contención de escritura en la tabla `User`), pero agrega una
  dependencia de infraestructura nueva que hoy no existe en el proyecto.
- **C3**: `@nestjs/throttler` a nivel de endpoint (limita intentos por
  IP/tiempo, no por cuenta). Complementario a C1/C2, no sustituto — protege
  contra fuerza bruta distribuida por IP, no contra un atacante que ya sabe
  el email de la víctima.

Recomiendo **C1 + C3 combinados**: C1 protege la cuenta específica, C3
protege el endpoint en general. Falta definir con vos: umbral de intentos,
ventana de tiempo, y duración del bloqueo — son parámetros de producto, no
solo técnicos.

### Decisión D — Cuándo planificar el upgrade mayor de dependencias (resuelve H12, Medio)

No es urgente (las vulnerabilidades reales de runtime son moderadas, no
críticas, y la mayoría del conteo de `npm audit` son herramientas de
desarrollo). Pero saltar NestJS 10→11 y Prisma 5→7 a mitad de un sprint de
features sería exactamente el tipo de riesgo que no querés correr sin
planearlo aparte. Propongo tratarlo como su propio sprint de mantenimiento
(no featureless, pero sin código nuevo de negocio en el medio) en algún
punto antes de un lanzamiento comercial, no como parte de Sprint 3.

## 3. Checklist de calidad

| Área | Estado |
|---|---|
| Arquitectura Clean Architecture por módulo | ✅ Consistente en los 7 módulos |
| `domain/` sin imports de Nest/Prisma | ✅ Verificado, sin excepciones |
| Aislamiento multiempresa (aplicación) | ✅ Guard + filtro `companyId` en cada repo |
| Aislamiento multiempresa (base de datos / RLS) | ❌ Pendiente — Decisión B |
| Transacciones de base de datos | ❌ Pendiente — Decisión A (Crítico) |
| Auditoría de acciones sensibles | ✅ Uniforme en los 3 sprints |
| Restricciones de integridad en base de datos | 🟡 Mejorada esta auditoría (unicidad CUIT, CHECK creditLimit), sigue habiendo reglas solo en aplicación |
| Autenticación (login/refresh/logout) | ✅ Completa recién ahora (logout agregado) |
| Bloqueo por intentos fallidos | ❌ Pendiente — Decisión C |
| Documentación de API (Swagger) | ✅ Agregada esta auditoría |
| Cabeceras de seguridad HTTP (`helmet`) | ✅ Agregado esta auditoría |
| Tests unitarios | ✅ 112/112, huecos de cobertura cerrados esta auditoría |
| Tests de integración | ❌ No existen (documentado desde Sprint 0, sin infraestructura para esto todavía) |
| Tests end-to-end | 🟡 Manuales con `curl`, no automatizados |
| `tsc --noEmit` / lint | ✅ 0 errores |
| CHANGELOG y versionado | ✅ Al día hasta v0.3.0, esta auditoría suma v0.3.1 |
| Dependencias sin vulnerabilidades críticas de runtime | 🟡 Moderadas en runtime, altas solo en tooling de build — Decisión D |
| Compatibilidad con módulos futuros (Ventas, Compras, Stock, Contabilidad, RRHH, Documentos, BI) | 🟡 Ver §4 |

## 4. Compatibilidad con módulos futuros

No se encontró ninguna decisión ya tomada que **impida** construir Ventas,
Compras, Stock, Contabilidad, RRHH, Documentos o BI — el modelo de Terceros
(`Party`) está pensado explícitamente para que Ventas referencie `Customer`
y Compras referencie `Supplier` sin fricción. Sí hay dos cosas que **conviene
resolver antes**, no después, porque las próximas tablas (movimientos
financieros, ventas, compras) son exactamente donde más duelen si faltan:

1. **La Decisión A (transacciones)** — Ventas/Cobranzas y Compras/Pagos son,
   por definición, flujos multi-tabla (venta + ítems + cuenta por cobrar
   + movimiento de caja). Construirlos sin transacciones repetiría H1 en un
   lugar con consecuencias financieras directas, no solo administrativas.
2. **La evaluación de UUID v7** para las tablas de movimientos, ya
   documentada como pendiente desde Sprint 1 (`ARQUITECTURA.md` §8) — sigue
   vigente, no se resuelve en esta auditoría porque esas tablas todavía no
   existen.

## 5. Estado general del proyecto

**72% — no es "Production Ready" todavía.**

Lo que sostiene ese número: arquitectura consistente y bien probada (112/112
tests), aislamiento multiempresa funcional en la capa de aplicación,
auditoría completa, documentación exhaustiva y trazable sprint a sprint,
autenticación ahora completa (con logout), API ahora documentada y con
cabeceras de seguridad básicas.

Lo que lo baja de un número más alto: un hallazgo **Crítico real** (falta de
transacciones) que el propio documento fuente exige como decisión
obligatoria y que no estaba resuelto en ningún sprint anterior; dos
hallazgos **Altos** de seguridad (RLS, bloqueo de login) explícitamente
pedidos por el documento fuente y todavía pendientes; y cero pruebas de
integración/e2e automatizadas.

## 6. Recomendación final sobre Sprint 3

**No arrancaría Sprint 3 sin resolver la Decisión A (transacciones)
primero.** Ventas y Cobranzas es, estructuralmente, la parte más
multi-tabla de todo el sistema (venta + ítems + cuenta corriente + cobro +
movimiento de caja, todo en la misma operación de negocio) — es exactamente
donde el Hallazgo Crítico H1 más golpearía si se construye encima sin
resolverlo antes. Las Decisiones B y C (RLS, bloqueo de login) son Altas
pero no bloquean estructuralmente el diseño de Ventas de la misma manera;
podrían resolverse en paralelo o inmediatamente después sin tanto riesgo de
tener que rehacer código de Sprint 3.

Quedo esperando tu decisión sobre A (y, si querés resolverlas ahora también,
B/C/D) antes de escribir una sola línea de Sprint 3.
