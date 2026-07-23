# Sprint 1 — Módulo 1: Empresas y Sucursales

Corresponde a M02 (Empresas y configuración) del documento fuente y a la pantalla P04.
Estado: **implementado y verificado. Ver §7 para el resultado real.**

## 0. Decisión de diseño previa (acordada con el usuario)

El documento fuente dice que "Administrador Estrategos" da de alta empresas para su
consultora, pero `docs/ARQUITECTURA.md` fija que no existe un rol global de usuario:
todo rol vive en `company_users` (por empresa). No hay fila de `company_users` de una
empresa que todavía no existe, así que no hay a qué atarse para autorizar el alta.

**Resuelto:** puede crear una empresa nueva cualquier usuario que ya tenga rol
`Superadministrador` o `Administrador Estrategos` en **al menos una empresa existente
del mismo tenant**. No se agrega ningún rol global al modelo de `User`; se deriva del
tenant a partir de las membresías (`company_users`) que ya tiene. Ver RN-EMP-03.

## 1. Modelo de datos

### 1.1 `Company` (extiende el modelo ya existente de Sprint 0)

Campos ya existentes (sin cambios): `id`, `tenantId`, `legalName`, `taxId`,
`taxCondition`, `isActive`, `createdAt`, `updatedAt`.

Campos nuevos que agrega este módulo (M02: "razón social, CUIT, condición fiscal,
actividad, domicilios, contactos y logotipo" + "moneda principal, zona horaria y
formatos"):

| Campo | Tipo | Notas |
|---|---|---|
| `activity` | `String?` | Actividad económica declarada. |
| `address` | `String?` | Domicilio principal. **Decisión de alcance**: el MVP modela un único domicilio por empresa, no domicilios múltiples (fiscal/comercial separados) — el documento fuente no detalla esa necesidad y agregarla ahora sería anticipar un requisito no confirmado. |
| `contactName` | `String?` | Nombre de contacto principal. |
| `contactEmail` | `String?` | Email de contacto principal. |
| `contactPhone` | `String?` | Teléfono de contacto principal. |
| `logoUrl` | `String?` | URL del logotipo (la subida de archivos real depende de almacenamiento S3/R2, fuera de alcance de este módulo — se guarda la URL, no el archivo). |
| `currency` | `String` | Moneda principal, default `"ARS"`. Código libre (no enum), sin validación contra ISO-4217 en este sprint. |
| `timezone` | `String` | Default `"America/Argentina/Jujuy"` (requisito de localización, sección 9 del doc fuente). |

**Fuera de alcance explícito de este módulo**: "formatos" (de fecha/número) — el
documento fuente no especifica qué formatos configurables necesita, así que no se
agrega ningún campo para esto todavía; se retoma si aparece un requisito concreto.

No se agrega `createdByUserId` a `Company`: quién la creó ya queda registrado en
`AuditLog` (ver RN-EMP-05), y agregar la columna sería duplicar esa información sin
un caso de uso que la necesite hoy.

### 1.2 `Branch` (Sucursal) — modelo nuevo

```prisma
model Branch {
  id        String   @id @default(uuid())
  companyId String   @map("company_id")
  name      String
  address   String?
  phone     String?
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  company Company @relation(fields: [companyId], references: [id])

  @@index([companyId])
  @@map("branches")
}
```

Se agrega la relación inversa `branches Branch[]` en `Company`.

## 2. Reglas de negocio

| ID | Regla | Origen |
|---|---|---|
| RN-EMP-01 | Toda `Company` pertenece a un `Tenant`; toda `Branch` pertenece a una `Company`. | RN-001 |
| RN-EMP-02 | Un usuario solo puede ver/editar una empresa puntual si tiene una fila en `company_users` para esa empresa (ya reforzado por `CompanyContextGuard` vía header `X-Company-Id`). | RN-002 |
| RN-EMP-03 | Solo puede **crear** una empresa un usuario con rol `Superadministrador` o `Administrador Estrategos` en al menos una empresa del mismo tenant. | Ver §0 |
| RN-EMP-04 | Ni empresas ni sucursales se eliminan físicamente; se desactivan (`isActive=false`) con motivo. | RN-003 |
| RN-EMP-05 | Alta, edición y cambio de estado (activar/desactivar) de una empresa o sucursal generan un registro en `AuditLog`. | RN-009 |
| RN-EMP-06 | Activar una empresa/sucursal ya activa, o desactivar una ya inactiva, es un error de validación (400), no una operación silenciosa. | Consistencia de auditoría |
| RN-EMP-07 | Solo pueden **editar** una empresa (`PATCH`) los roles `Administrador Estrategos`, `Propietario` o `Administrador de empresa` sobre esa empresa. `Consultor`, `Contador externo`, `Empleado` y `Auditor` solo pueden leer. | Tabla de roles del doc fuente |
| RN-EMP-08 | El CUIT, si se informa, debe cumplir el formato `NN-NNNNNNNN-N` (con o sin guiones) — solo se valida formato, no existencia real ante ARCA (explícitamente fuera de alcance de la Etapa 1). | M02 + 6.2 fuera de alcance |
| RN-EMP-09 | Una sucursal siempre se crea/edita/desactiva en el contexto de una empresa autorizada (mismo guard que RN-EMP-02); no existe endpoint para listar sucursales sin especificar empresa. | RN-001/002 |

## 3. Endpoints

Todos requieren JWT (guard global ya existente). Los marcados **[CTX]** además
requieren el header `X-Company-Id` y pasan por `CompanyContextGuard`.

| Método | Endpoint | Caso de uso | Autorización |
|---|---|---|---|
| `GET` | `/me/companies` | `ListMyCompaniesUseCase` (ya existe, sin cambios) | Cualquier usuario autenticado |
| `POST` | `/companies` | `CreateCompanyUseCase` | RN-EMP-03 (rol de tenant) |
| `GET` | `/companies/:id` **[CTX]** | `GetCompanyByIdUseCase` | Cualquier miembro de la empresa |
| `PATCH` | `/companies/:id` **[CTX]** | `UpdateCompanyUseCase` | RN-EMP-07 |
| `POST` | `/companies/:id/deactivate` **[CTX]** | `DeactivateCompanyUseCase` | RN-EMP-07 |
| `POST` | `/companies/:id/activate` **[CTX]** | `ActivateCompanyUseCase` | RN-EMP-07 |
| `GET` | `/companies/:id/branches` **[CTX]** | `ListBranchesUseCase` | Cualquier miembro de la empresa |
| `POST` | `/companies/:id/branches` **[CTX]** | `CreateBranchUseCase` | RN-EMP-07 |
| `PATCH` | `/companies/:id/branches/:branchId` **[CTX]** | `UpdateBranchUseCase` | RN-EMP-07 |
| `POST` | `/companies/:id/branches/:branchId/deactivate` **[CTX]** | `DeactivateBranchUseCase` | RN-EMP-07 |
| `POST` | `/companies/:id/branches/:branchId/activate` **[CTX]** | `ActivateBranchUseCase` | RN-EMP-07 |

**Nota sobre el chequeo de rol (RN-EMP-07)**: el módulo de Roles y Permisos (Módulo 2
de este sprint) todavía no existe, así que este módulo implementa una verificación de
rol **mínima y local** (un helper que compara `request.roleId` contra los nombres de
rol permitidos, resuelto vía `Role.name`), sin crear un `@Roles()`/`RolesGuard`
reutilizable todavía. Cuando el Módulo 2 aporte ese mecanismo genérico, este módulo se
migra a usarlo (se deja anotado como deuda técnica explícita, no silenciosa).

## 4. Casos de uso (application/use-cases, uno por responsabilidad)

1. `CreateCompanyUseCase` — valida rol de tenant (RN-EMP-03), valida formato de CUIT
   (RN-EMP-08), crea la empresa, crea automáticamente la membresía `company_users`
   del creador con rol `Administrador Estrategos` (si no la tenía ya para esa
   empresa — no puede tenerla, es nueva), registra auditoría.
2. `UpdateCompanyUseCase` — valida rol (RN-EMP-07), valida CUIT si se cambia,
   actualiza campos editables, registra auditoría con el diff de campos relevantes.
3. `GetCompanyByIdUseCase` — devuelve la empresa (ya filtrada por `CompanyContextGuard`).
4. `ListMyCompaniesUseCase` — ya existe, sin cambios.
5. `DeactivateCompanyUseCase` — valida rol, valida RN-EMP-06, exige `reason` (motivo)
   en el body, marca `isActive=false`, registra auditoría con el motivo.
6. `ActivateCompanyUseCase` — valida rol, valida RN-EMP-06, marca `isActive=true`,
   registra auditoría.
7. `CreateBranchUseCase` — valida rol (RN-EMP-07), crea la sucursal bajo la empresa
   del contexto, registra auditoría.
8. `UpdateBranchUseCase` — valida rol, valida que la sucursal pertenezca a la empresa
   del contexto (RN-EMP-09), actualiza, registra auditoría.
9. `ListBranchesUseCase` — lista sucursales de la empresa del contexto.
10. `DeactivateBranchUseCase` — análogo a `DeactivateCompanyUseCase`, exige motivo.
11. `ActivateBranchUseCase` — análogo a `ActivateCompanyUseCase`.

## 5. Pruebas

### 5.1 Unitarias (mismo patrón que `LoginUseCase`: repos/puertos mockeados)

- `CreateCompanyUseCase`
  - crea la empresa cuando el usuario tiene rol `Administrador Estrategos` en una
    empresa del tenant.
  - crea la empresa cuando el usuario tiene rol `Superadministrador`.
  - rechaza (`ForbiddenException` de dominio) si el usuario no tiene ninguno de esos
    roles en ninguna empresa del tenant.
  - rechaza si el CUIT tiene formato inválido.
  - registra la auditoría con `action: 'company.create'`.
- `UpdateCompanyUseCase`
  - actualiza campos permitidos cuando el rol autoriza.
  - rechaza si el rol es `Consultor`/`Auditor`/`Contador externo`/`Empleado`.
  - rechaza CUIT con formato inválido.
- `DeactivateCompanyUseCase` / `ActivateCompanyUseCase`
  - cambia el estado y registra auditoría con el motivo (solo deactivate).
  - rechaza si ya está en el estado destino (RN-EMP-06).
- `CreateBranchUseCase` / `UpdateBranchUseCase` / `DeactivateBranchUseCase` /
  `ActivateBranchUseCase` — mismos criterios que su equivalente de empresa, más:
  rechaza si `branchId` no pertenece a la `companyId` del contexto.

### 5.2 Verificación end-to-end manual (mismo método que el cierre de Sprint 0: `curl`)

- Alta de empresa con usuario autorizado → 201 y la empresa aparece en
  `GET /me/companies` del creador.
- Alta de empresa con usuario NO autorizado → 403.
- Edición/activación/desactivación fuera del rol permitido → 403.
- Acceso a una empresa sin `X-Company-Id` o con una empresa ajena → 403
  (ya cubierto por `CompanyContextGuard`, se re-verifica con las rutas nuevas).
- Alta de sucursal, listado, edición, desactivación y reactivación → verificado con
  `curl` contra Postgres real, igual que el login en Sprint 0.

### 5.3 Explícitamente no cubierto en este módulo

- Pruebas de integración automatizadas contra una base de datos real (Jest +
  Postgres de test) — no había infraestructura de integration-test en Sprint 0 y
  agregarla no está pedida para este módulo; la verificación end-to-end se hace
  manualmente con `curl`, igual que se hizo para cerrar Sprint 0.
- Subida real del logotipo (`logoUrl` queda como campo de texto; el flujo de subida
  de archivos a almacenamiento S3-compatible es de un módulo posterior, M10).

## 6. Resumen de archivos a tocar (para la revisión posterior)

- `apps/api/prisma/schema.prisma` — nuevos campos de `Company` + modelo `Branch` +
  migración.
- `apps/api/src/modules/companies/domain/**` — entidades `CompanyEntity` (extendida),
  `BranchEntity` (nueva), errores de dominio (`CompanyRoleNotAuthorizedError`,
  `InvalidTaxIdError`, `CompanyAlreadyInStateError`), interfaces de repositorio
  extendidas.
- `apps/api/src/modules/companies/application/use-cases/**` — los 11 casos de uso
  listados en §4.
- `apps/api/src/modules/companies/infrastructure/persistence/**` — implementación
  Prisma de los repositorios extendidos + repositorio de `AuditLog`.
- `apps/api/src/modules/companies/presentation/**` — controller extendido + DTOs de
  entrada con `class-validator`.
- `apps/api/test/companies/**` — specs de los 11 casos de uso.

## 7. Resultado real (verificado, no supuesto)

- ✅ `npx tsc --noEmit`: 0 errores.
- ✅ `npm run lint`: 0 errores.
- ✅ `npm test`: **31/31 tests pasan** (empresas + sucursales + los 4 de auth de Sprint 0, que siguen pasando).
- ✅ Migración `company_fields_branches_auditlog_index` aplicada contra Postgres real.
- ✅ Verificación end-to-end manual con `curl` contra el servidor compilado: alta de
  empresa autorizada (201) y no autorizada (403 — RN-EMP-03), lectura, edición,
  inconsistencia `:id` vs `X-Company-Id` (400), acceso a empresa ajena (403), alta de
  sucursal, listado, edición, desactivar sin motivo (400), desactivar con motivo
  (201), desactivar dos veces (400 — RN-EMP-06), reactivar. Los 6 eventos de
  auditoría esperados aparecen en `audit_logs` con los metadatos correctos
  (RN-EMP-05).

### Desviaciones y hallazgos durante la implementación (no estaban en el plan original)

1. **Bug real en `tsconfig.build.json` / caché incremental**: al borrar `dist/` sin
   borrar `tsconfig.build.tsbuildinfo`, `nest build`/`tsc` terminaban con éxito
   (exit code 0) pero sin emitir casi ningún archivo — una falla silenciosa
   peligrosa. Se corrigió agregando `*.tsbuildinfo` a `.gitignore` para que nunca
   quede compartida entre máquinas/commits; si vuelve a pasar, se resuelve
   borrando ese archivo junto con `dist/`.
2. **Ajuste a `.eslintrc.js`**: se agregó `argsIgnorePattern`/`varsIgnorePattern:
   '^_'` a `no-unused-vars`, porque el patrón "destructurar para excluir campos
   antes de pasarlos a Prisma" (usado en `UpdateCompanyUseCase` y
   `UpdateBranchUseCase`) lo disparaba sin razón real.
3. **Dato de prueba en la base de desarrollo**: la verificación end-to-end creó una
   empresa real ("Empresa Nueva SRL") y una sucursal en `estrategos_dev`. Se dejaron
   como quedaron (RN-EMP-04: nada se borra físicamente, ni siquiera datos de prueba)
   — no afecta al seed oficial ni a ningún test automatizado, que usan mocks.
4. Para probar el camino de alta autorizada de RN-EMP-03 hizo falta un usuario con
   rol `Administrador Estrategos`, que el seed de Sprint 0 no crea (el usuario seed
   tiene `Administrador de empresa`). Se promovió el rol del usuario seed
   temporalmente por SQL directo para la prueba y se revirtió al terminar — no se
   modificó el seed ni quedó ningún cambio permanente por este motivo.
