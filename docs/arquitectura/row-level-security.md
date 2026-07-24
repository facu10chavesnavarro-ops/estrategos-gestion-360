# Row Level Security (RLS) — diseño de arquitectura

Resuelve el Hallazgo Alto H3 de `docs/AUDITORIA-TECNICA-PRE-SPRINT-3.md`.
Decisión tomada por el usuario (Decisión B): **diseñar la arquitectura ahora
y dejar la implementación para después de Sprint 3**, ya que el modelo
multiempresa ya fue preparado con `companyId`. Este documento es solo
diseño — no se aplica ninguna migración, no se crea ninguna política SQL, no
se escribe ningún código de runtime. La opción elegida dentro de la
Decisión B es **B1**: implementarlo junto con la infraestructura de
transacciones (Unit of Work), que ya existe (ver
`docs/arquitectura/unit-of-work-y-transacciones.md`) — este documento define
cómo RLS se apoya en esa infraestructura ya construida.

## 1. Problema

El aislamiento multiempresa hoy depende **exclusivamente** de la capa de
aplicación: `CompanyContextGuard` resuelve `X-Company-Id` en
`request.companyId`, y cada repositorio filtra manualmente por ese
`companyId` en cada consulta. Es una barrera real, pero es **una sola
barrera**: un `where` olvidado en un método nuevo (o en uno de los ~15
módulos futuros — Ventas, Compras, Inventario, Contabilidad, RRHH,
Documentos, BI) es una fuga de datos entre empresas, sin ninguna segunda
línea de defensa a nivel de base de datos que lo contenga.

RLS de Postgres agrega esa segunda barrera: aunque una consulta de
aplicación "olvide" el filtro, Postgres igual no devuelve (ni permite
escribir) filas de otra empresa, porque la restricción vive en el motor de
base de datos, no en el código que la consulta.

## 2. Mecanismo elegido

Políticas RLS nativas de Postgres (`CREATE POLICY`), activadas por tabla con
`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` **y** `FORCE ROW LEVEL SECURITY`
(el `FORCE` es obligatorio: por defecto Postgres exime al *owner* de la
tabla de sus propias políticas, y el usuario de aplicación —
`estrategos` — es el owner de todas las tablas).

La empresa "actual" se comunica a Postgres vía una variable de sesión GUC,
leída por cada política:

```sql
-- Ejemplo de la forma que tendrán las políticas (no aplicado todavía):
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;

CREATE POLICY customers_isolation ON customers
  USING (company_id = current_setting('app.current_company_id', true)::uuid);
```

`current_setting(..., true)` (con el segundo argumento `true`) devuelve
`NULL` si la variable no fue seteada, en vez de lanzar error. Esto es
deliberado: `company_id = NULL` siempre evalúa a `false` en SQL, así que si
alguna consulta corre sin haber seteado `app.current_company_id`, la
política **falla cerrada** (cero filas visibles) en vez de fallar abierta
(todas las filas visibles). Cualquier variante de política debe preservar
esta propiedad — es la que hace que un bug de "me olvidé de setear la
variable" sea un error visible (nada se ve) y no un agujero de seguridad
silencioso (se ve todo).

## 3. Dos niveles de alcance: tenant y empresa

No todas las tablas se filtran por lo mismo:

| Tabla | Columna de alcance | Variable de sesión |
|---|---|---|
| `tenants` | — (es la raíz) | ninguna — no lleva RLS |
| `companies` | `tenant_id` | `app.current_tenant_id` |
| `branches`, `parties`, `customers`, `suppliers`, `company_users`, `invitations` | `company_id` | `app.current_company_id` |
| `users` | — (no pertenece a una empresa) | ninguna — no lleva RLS |
| `refresh_tokens` | — (pertenece a un `user`, no a una empresa) | ninguna — no lleva RLS |
| `audit_logs` | `company_id` (nullable) | `app.current_company_id`, con caso especial (ver §5) |

`Tenant` y `User` quedan fuera de RLS: no tienen una columna de alcance
propia que aislar (son ellos mismos la raíz de aislamiento, o pertenecen a
un usuario individual, no a una empresa).

## 4. El desafío real: RLS no es solo para escrituras multi-tabla

La refactorización de Unit of Work (Decisión A) solo tocó los casos de uso
que escriben en más de una tabla — la mayoría de las lecturas (`Get*ById`,
`List*`) siguen llamando al repositorio directamente, sin abrir ninguna
transacción, porque no lo necesitan para ser atómicas.

RLS **no tiene ese lujo**: `SET LOCAL` solo tiene efecto dentro de la
transacción en la que se ejecuta. Si una lectura simple hace una sola
llamada a Prisma fuera de una transacción, no hay ningún `SET LOCAL` previo
que la política pueda leer — y por la Regla de la §2 (fallar cerrado), esa
lectura devolvería cero filas, rompiendo la aplicación en vez de protegerla.

Esto significa que **literalmente cada consulta** — no solo las
multi-escritura — necesita ejecutarse dentro de una transacción de una sola
sentencia que primero fija `app.current_company_id` y después corre la
consulta real. Es una diferencia de fondo respecto de la Decisión A: ahí la
transacción era una decisión de negocio (atomicidad de una operación
multi-tabla); acá es un requisito técnico de la variable de sesión, que
aplica a todo el sistema por igual.

### 4.1 Por qué esto cambia el mecanismo de propagación

En la Decisión A se decidió *no* usar `AsyncLocalStorage` para el contexto
de transacción, a favor de un parámetro `ctx?` explícito — para que el
call site muestre claramente si una operación participa de una transacción.
Esa razón no aplica igual acá: la "empresa actual" no es una decisión de
negocio por caso de uso, es un dato *ambiental* de la request completa
(ya lo es hoy: `CompanyContextGuard` lo resuelve una vez por request desde
`X-Company-Id`). Forzar a agregar un parámetro `companyId` explícito a
*cada* método de *cada* repositorio — incluyendo los que ya tienen `ctx?`
por Unit of Work, y los que no — sería una segunda ola de cambios mecánicos
sobre las mismas ~40 firmas, con poco beneficio de claridad (el dato ya
existe en `request.companyId`, repetirlo en cada llamada es ruido, no
señal).

La recomendación para RLS es la inversa de la de Unit of Work:
`AsyncLocalStorage`, exclusivamente para este dato ambiental (nunca para el
`TransactionContext`, que sigue siendo explícito). Nombre propuesto:
`CompanyScopeContext`, para no confundirlo con `TransactionContext`.

### 4.2 Piezas a construir (cuando se implemente)

```
common/infrastructure/rls/
  company-scope.store.ts     — AsyncLocalStorage<{ companyId?: string; tenantId?: string }>
  company-scope.middleware.ts — puebla el store desde CompanyContextGuard (o el guard lo puebla directo)
  prisma-rls.extension.ts     — Prisma Client Extension ($extends)
```

`PrismaRlsExtension` intercepta cada operación de Prisma (`$allOperations` o
equivalente) y:

1. Lee `companyId`/`tenantId` del `CompanyScopeContext` actual.
2. Si la operación ya corre dentro de un `TransactionContext` abierto por
   `UnitOfWork.run()` (se puede detectar porque ya es un
   `Prisma.TransactionClient`), emite `SET LOCAL` **una sola vez** al
   principio de esa transacción — no en cada llamada dentro de ella.
3. Si la operación es una llamada suelta (sin `UnitOfWork.run()` alrededor —
   el caso de la mayoría de las lecturas hoy), la envuelve
   transparentemente en `prisma.$transaction(async (tx) => { SET LOCAL ...;
   return <la operación original contra tx>; })`. Esto agrega un round-trip
   extra a cada lectura simple — costo aceptado a cambio de la segunda
   barrera; se mide el impacto real en el rollout incremental (§6).

Este extension es el único lugar del código de aplicación que sabe que RLS
existe — los casos de uso y los repositorios no cambian ni una firma.

## 5. Caso especial: consultas que cruzan empresas a propósito

`CompanyUserRepository.hasRoleInTenant()` es, por diseño, una consulta que
busca membresías **en todas las empresas de un tenant** (se usa en
`CreateCompanyUseCase` para autorizar la creación de una empresa nueva antes
de que esa empresa exista — no hay un `companyId` "actual" todavía en ese
punto). Una política RLS scopeada por `app.current_company_id` sobre
`company_users` bloquearía esta consulta por completo, incluso siendo
legítima.

Esto no es un caso límite raro: es la naturaleza de cualquier operación de
alcance *tenant* (no *empresa*) — el equivalente para módulos futuros sería,
por ejemplo, un reporte consolidado multi-empresa para Contabilidad. La
solución no es debilitar la política de `company_users`, es reconocer que
esta consulta corre bajo un alcance distinto (`app.current_tenant_id`, el
mismo que usa la política de `companies`) y darle una política adicional
para ese caso:

```sql
-- Ejemplo, no aplicado: una policy adicional para el caso tenant-scoped.
CREATE POLICY company_users_tenant_bootstrap ON company_users
  USING (
    company_id IN (
      SELECT id FROM companies
      WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
  );
```

Postgres evalúa políticas múltiples sobre la misma tabla con `OR` (para
`USING`), así que agregar esta policy no debilita la principal — solo abre
una ventana adicional, explícita y auditable, para el único flujo que
legítimamente la necesita. Cualquier caso similar que aparezca en módulos
futuros debe resolverse con el mismo patrón: una policy nueva y nombrada
para el alcance real de la consulta, nunca ensanchando la policy por
`company_id` existente.

`audit_logs.company_id` es nullable por diseño (algunas acciones son a
nivel plataforma, sin empresa asociada — hoy no hay ninguna, pero el campo
lo permite). La policy de esa tabla deberá aceptar explícitamente
`company_id IS NULL OR company_id = current_setting(...)::uuid` en vez de
heredar la comparación estricta de las demás tablas.

## 6. Plan de implementación (para cuando se decida ejecutar, post-Sprint 3)

1. **Migración SQL cruda** (Prisma no genera políticas RLS — se escriben a
   mano, como ya se hizo con el `CHECK` constraint de `creditLimit`):
   `ALTER TABLE ... ENABLE/FORCE ROW LEVEL SECURITY` + `CREATE POLICY` por
   tabla de la tabla de §3, incluyendo la policy adicional de §5.
2. **Plomería de aplicación**: `CompanyScopeContext` (ALS) +
   `PrismaRlsExtension`, registrados una sola vez en `PrismaService`.
3. **Rollout incremental, tabla por tabla** — no activar las 7 tablas a la
   vez. Orden sugerido: empezar por `branches` (bajo volumen, sin
   dependencias cruzadas), verificar la batería de tests existente completa
   sin regresiones, medir el costo extra de round-trip en lecturas simples;
   recién después seguir con `parties`/`customers`/`suppliers`,
   `company_users`, `invitations`, y por último `audit_logs` (por el caso
   nullable de §5).
4. **Batería de pruebas de aislamiento cruzado** (la razón de ser de RLS):
   tests de integración con dos empresas reales en la misma base, que
   llamen al **repositorio directamente** (no a través del use case ni del
   guard) con `app.current_company_id` seteado a la empresa equivocada, o
   sin setear, y verifiquen que la fila de la otra empresa es invisible —
   probando la barrera de base de datos de forma aislada de la barrera de
   aplicación. Verificar también que `CompanyContextGuard` + RLS combinados
   siguen devolviendo el comportamiento HTTP esperado (403 antes de llegar a
   la base, no un 500 de Postgres).
5. **Regresión completa** (unit + integración + e2e) antes de dar por
   cerrado el rollout de cada tabla.

## 7. Qué NO se hace en este documento

- No se crea ninguna migración.
- No se escribe `CompanyScopeContext`, `PrismaRlsExtension`, ni ningún otro
  código de runtime.
- No se modifica `CompanyContextGuard` ni ningún repositorio existente.
- No se activa `ENABLE ROW LEVEL SECURITY` en ninguna tabla real.

Este documento deja la decisión de *cómo* tomada; la decisión de *cuándo*
ejecutarla sigue siendo del usuario, después de Sprint 3, como se acordó.
